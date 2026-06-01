const form = document.querySelector('#upload-form');
const statusElement = document.querySelector('#status');
const resultsBody = document.querySelector('#results-body');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resultsBody.replaceChildren();
  setStatus('Uploading CSV...');

  const formData = new FormData(form);
  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      body: formData
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Upload failed.');
    }

    setStatus(`Job ${payload.id} queued with ${payload.total} rows.`);
    connectEvents(payload.id);
  } catch (error) {
    setStatus(error.message, true);
  }
});

function connectEvents(jobId) {
  const events = new EventSource(`/api/jobs/${jobId}/events`);

  events.addEventListener('snapshot', (event) => {
    renderJob(JSON.parse(event.data).job);
  });

  events.addEventListener('started', (event) => {
    renderJob(JSON.parse(event.data).job);
  });

  events.addEventListener('progress', (event) => {
    const payload = JSON.parse(event.data);
    renderJob(payload.job);
  });

  events.addEventListener('completed', (event) => {
    renderJob(JSON.parse(event.data).job);
    events.close();
  });

  events.addEventListener('failed', (event) => {
    renderJob(JSON.parse(event.data).job);
    events.close();
  });

  events.onerror = () => {
    setStatus('Event stream interrupted. Refresh job status or retry the upload.', true);
    events.close();
  };
}

function renderJob(job) {
  const percent = job.total ? Math.round((job.processed / job.total) * 100) : 0;
  setStatus(`Job ${job.id}: ${job.status} (${job.processed}/${job.total}, ${percent}%).${job.error ? ` ${job.error}` : ''}`);
  resultsBody.replaceChildren(...job.results.map(renderRow));
}

function renderRow(result) {
  const row = document.createElement('tr');
  if (String(result.processorStatus).toLowerCase() === 'failed' || result.errorMessage) {
    row.classList.add('failed');
  }

  [
    result.rowNumber,
    result.lastFour ? `•••• ${result.lastFour}` : '',
    result.expirationDate || '',
    result.processorStatusCode || '',
    result.processorStatus || '',
    result.declineReason || '',
    [result.errorMessage, result.expirationWarning].filter(Boolean).join(' ')
  ].forEach((value) => {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  });

  return row;
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('error', isError);
}
