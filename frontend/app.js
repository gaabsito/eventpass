const form = document.querySelector('#request-form');
const status = document.querySelector('#status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Registrando tu interés…';
  try {
    const response = await fetch(window.API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo completar la solicitud.');
    status.textContent = `${data.message} Referencia: ${data.id}`;
    form.reset();
  } catch (error) {
    status.textContent = error instanceof TypeError ? 'No se pudo confirmar el envío. Comprueba tu conexión antes de repetirlo.' : error.message;
  } finally { button.disabled = false; }
});
