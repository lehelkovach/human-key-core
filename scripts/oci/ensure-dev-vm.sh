#!/usr/bin/env bash
set -euo pipefail

DISPLAY_NAME="${OCI_INSTANCE_DISPLAY_NAME:-intuit-card-dev}"
PROJECT_REPO="${OCI_PROJECT_REPO:-intuit-card}"
SHAPE="${OCI_SHAPE:-VM.Standard.E2.1.Micro}"
VCN_CIDR="${OCI_VCN_CIDR:-10.42.0.0/16}"
SUBNET_CIDR="${OCI_SUBNET_CIDR:-10.42.1.0/24}"
APP_PORT="${PORT:-3000}"

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_env OCI_TENANCY_OCID
require_env OCI_USER_OCID
require_env OCI_COMPARTMENT_OCID
require_env OCI_REGION
require_env OCI_FINGERPRINT
require_env OCI_PRIVATE_KEY_B64

if ! command -v oci >/dev/null 2>&1; then
  echo "OCI CLI is required. Install it with: python3 -m pip install --user oci-cli" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT
chmod 700 "${WORK_DIR}"
printf '%s' "${OCI_PRIVATE_KEY_B64}" | base64 -d >"${WORK_DIR}/oci_api_key.pem"
chmod 600 "${WORK_DIR}/oci_api_key.pem"
cat >"${WORK_DIR}/config" <<CONFIG
[DEFAULT]
user=${OCI_USER_OCID}
fingerprint=${OCI_FINGERPRINT}
tenancy=${OCI_TENANCY_OCID}
region=${OCI_REGION}
key_file=${WORK_DIR}/oci_api_key.pem
CONFIG
chmod 600 "${WORK_DIR}/config"
export OCI_CLI_CONFIG_FILE="${WORK_DIR}/config"
export SUPPRESS_LABEL_WARNING=True
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True

echo "[oci] Looking for existing ${DISPLAY_NAME}"
existing_id="$(oci compute instance list \
  --compartment-id "${OCI_COMPARTMENT_OCID}" \
  --display-name "${DISPLAY_NAME}" \
  --lifecycle-state RUNNING \
  --query 'data[0].id' \
  --raw-output 2>/dev/null || true)"

if [ -n "${existing_id}" ] && [ "${existing_id}" != "null" ]; then
  echo "[oci] Reusing running instance ${existing_id}"
  vnic_id="$(oci compute vnic-attachment list --compartment-id "${OCI_COMPARTMENT_OCID}" --instance-id "${existing_id}" --query 'data[0]."vnic-id"' --raw-output 2>/dev/null || true)"
  public_ip=""
  if [ -n "${vnic_id}" ] && [ "${vnic_id}" != "null" ]; then
    public_ip="$(oci network vnic get --vnic-id "${vnic_id}" --query 'data."public-ip"' --raw-output 2>/dev/null || true)"
  fi
  oci compute instance get --instance-id "${existing_id}" --query 'data.{id:id,displayName:"display-name",state:"lifecycle-state"}'
  if [ -n "${public_ip}" ] && [ "${public_ip}" != "null" ]; then
    echo "[oci] Public IP: ${public_ip}"
  fi
  exit 0
fi

echo "[oci] No running ${DISPLAY_NAME} found; creating network if needed"
vcn_id="$(oci network vcn list --compartment-id "${OCI_COMPARTMENT_OCID}" --display-name "${DISPLAY_NAME}-vcn" --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "${vcn_id}" ] || [ "${vcn_id}" = "null" ]; then
  vcn_id="$(oci network vcn create \
    --compartment-id "${OCI_COMPARTMENT_OCID}" \
    --display-name "${DISPLAY_NAME}-vcn" \
    --cidr-block "${VCN_CIDR}" \
    --freeform-tags "{\"repo\":\"${PROJECT_REPO}\",\"environment\":\"dev\"}" \
    --query 'data.id' --raw-output)"
fi

igw_id="$(oci network internet-gateway list --compartment-id "${OCI_COMPARTMENT_OCID}" --vcn-id "${vcn_id}" --display-name "${DISPLAY_NAME}-igw" --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "${igw_id}" ] || [ "${igw_id}" = "null" ]; then
  igw_id="$(oci network internet-gateway create \
    --compartment-id "${OCI_COMPARTMENT_OCID}" \
    --vcn-id "${vcn_id}" \
    --is-enabled true \
    --display-name "${DISPLAY_NAME}-igw" \
    --query 'data.id' --raw-output)"
fi

route_table_id="$(oci network route-table list --compartment-id "${OCI_COMPARTMENT_OCID}" --vcn-id "${vcn_id}" --display-name "${DISPLAY_NAME}-rt" --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "${route_table_id}" ] || [ "${route_table_id}" = "null" ]; then
  route_table_id="$(oci network route-table create \
    --compartment-id "${OCI_COMPARTMENT_OCID}" \
    --vcn-id "${vcn_id}" \
    --display-name "${DISPLAY_NAME}-rt" \
    --route-rules "[{\"cidrBlock\":\"0.0.0.0/0\",\"networkEntityId\":\"${igw_id}\"}]" \
    --query 'data.id' --raw-output)"
fi

security_list_id="$(oci network security-list list --compartment-id "${OCI_COMPARTMENT_OCID}" --vcn-id "${vcn_id}" --display-name "${DISPLAY_NAME}-sl" --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "${security_list_id}" ] || [ "${security_list_id}" = "null" ]; then
  security_list_id="$(oci network security-list create \
    --compartment-id "${OCI_COMPARTMENT_OCID}" \
    --vcn-id "${vcn_id}" \
    --display-name "${DISPLAY_NAME}-sl" \
    --egress-security-rules '[{"destination":"0.0.0.0/0","protocol":"all"}]' \
    --ingress-security-rules "[{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":22,\"max\":22}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":${APP_PORT},\"max\":${APP_PORT}}}}]" \
    --query 'data.id' --raw-output)"
fi

subnet_id="$(oci network subnet list --compartment-id "${OCI_COMPARTMENT_OCID}" --vcn-id "${vcn_id}" --display-name "${DISPLAY_NAME}-subnet" --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "${subnet_id}" ] || [ "${subnet_id}" = "null" ]; then
  subnet_id="$(oci network subnet create \
    --compartment-id "${OCI_COMPARTMENT_OCID}" \
    --vcn-id "${vcn_id}" \
    --display-name "${DISPLAY_NAME}-subnet" \
    --cidr-block "${SUBNET_CIDR}" \
    --route-table-id "${route_table_id}" \
    --security-list-ids "[\"${security_list_id}\"]" \
    --prohibit-public-ip-on-vnic false \
    --query 'data.id' --raw-output)"
fi

availability_domain="$(oci iam availability-domain list --compartment-id "${OCI_TENANCY_OCID}" --query 'data[0].name' --raw-output)"
image_id="${OCI_IMAGE_OCID:-}"
if [ -z "${image_id}" ]; then
  image_id="$(oci compute image list \
    --compartment-id "${OCI_COMPARTMENT_OCID}" \
    --operating-system "Canonical Ubuntu" \
    --shape "${SHAPE}" \
    --sort-by TIMECREATED \
    --sort-order DESC \
    --query 'data[0].id' --raw-output)"
fi

ssh_public_key="${OCI_SSH_PUBLIC_KEY:-}"
if [ -z "${ssh_public_key}" ]; then
  key_dir="${OCI_GENERATED_KEY_DIR:-.oci-dev}"
  mkdir -p "${key_dir}"
  chmod 700 "${key_dir}"
  key_path="${key_dir}/${DISPLAY_NAME}_ssh"
  if [ ! -f "${key_path}" ]; then
    ssh-keygen -t ed25519 -N '' -f "${key_path}" -C "${DISPLAY_NAME}" >/dev/null
    chmod 600 "${key_path}"
  fi
  ssh_public_key="$(cat "${key_path}.pub")"
  echo "[oci] Using generated SSH key at ${key_path}. Keep it out of git and store it securely."
fi

cloud_init_b64="$(base64 -w0 infra/cloud-init/dev-vm.yaml)"

echo "[oci] Launching ${DISPLAY_NAME}"
oci compute instance launch \
  --compartment-id "${OCI_COMPARTMENT_OCID}" \
  --availability-domain "${availability_domain}" \
  --display-name "${DISPLAY_NAME}" \
  --shape "${SHAPE}" \
  --image-id "${image_id}" \
  --subnet-id "${subnet_id}" \
  --assign-public-ip true \
  --metadata "{\"ssh_authorized_keys\":\"${ssh_public_key}\",\"user_data\":\"${cloud_init_b64}\"}" \
  --freeform-tags "{\"repo\":\"${PROJECT_REPO}\",\"environment\":\"dev\"}" \
  --query 'data.{id:id,displayName:"display-name",state:"lifecycle-state"}'
