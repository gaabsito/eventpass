import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'node:crypto';
const db = new DynamoDBClient({});
const sns = new SNSClient({});
const reply = (statusCode, data) => ({ statusCode, headers: {
  'Content-Type': 'application/json', 'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,OPTIONS'
}, body: JSON.stringify(data) });
export const handler = async event => {
  const requestId = event.requestContext?.requestId ?? randomUUID();
  console.log(JSON.stringify({ event: 'request_received', requestId }));
  let body;
  try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString() : event.body ?? '{}'); }
  catch { return reply(400, { error: 'El cuerpo debe ser JSON válido.', requestId }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Envía un objeto JSON.', requestId });
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const interest = typeof body.interest === 'string' ? body.interest.trim() : '';
  if (!name || name.length > 100 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !interest || interest.length > 150) {
    console.log(JSON.stringify({ event: 'validation_failed', requestId }));
    return reply(400, { error: 'Revisa nombre, email e interés; los tres son obligatorios.', requestId });
  }
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  try {
    await db.send(new PutItemCommand({ TableName: process.env.TABLE_NAME, Item: {
      id: { S: id }, name: { S: name }, email: { S: email }, interest: { S: interest },
      timestamp: { S: timestamp }, requestId: { S: requestId }
    }}));
    console.log(JSON.stringify({ event: 'request_saved', id, requestId }));
  } catch (error) {
    console.error(JSON.stringify({ event: 'persistence_failed', requestId, error: error.name }));
    return reply(500, { error: 'No se pudo guardar la solicitud.', requestId });
  }
  try {
    const result = await sns.send(new PublishCommand({ TopicArn: process.env.TOPIC_ARN,
      Subject: 'Nueva solicitud - ' + name,
      Message: JSON.stringify({ id, name, email, interest, timestamp, requestId }, null, 2) }));
    console.log(JSON.stringify({ event: 'notification_published', id, requestId, messageId: result.MessageId }));
    return reply(201, { success: true, id, requestId, message: 'Solicitud guardada y notificada.' });
  } catch (error) {
    console.error(JSON.stringify({ event: 'notification_failed', id, requestId, error: error.name }));
    return reply(202, { success: true, id, requestId, notification: 'failed', message: 'Solicitud guardada; no se pudo enviar la notificación. No vuelvas a enviarla.' });
  }
};
