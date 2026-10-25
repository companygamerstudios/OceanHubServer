import { workerSource as source, functionSection, requireCheck } from './repo-audit-helpers.mjs';

const submit = functionSection('async function handleAirFlowCreateImageV11(env, request)', 'async function handleAirFlowCreateImageStatusV1');
const status = functionSection('async function handleAirFlowCreateImageStatusV1(env, request)', 'async function handleAirFlowLiveTokenV11');

requireCheck(submit.includes("provider === 'stablehorde'"), 'El generador admite Stable Horde como proveedor');
requireCheck(submit.includes('env.STABLE_HORDE_API_KEY'), 'La clave Stable Horde se obtiene del entorno del servidor');
requireCheck(submit.includes('https://stablehorde.net/api/v2/generate/async'), 'Las solicitudes usan el endpoint asíncrono oficial');
requireCheck(submit.includes('nsfw: false') && submit.includes('censor_nsfw: true'), 'Las imágenes se solicitan con protección NSFW activada');
requireCheck(submit.includes('ownerHash') && submit.includes('createdAt'), 'Cada tarea guarda propietario y tiempo de creación');
requireCheck(status.includes('job.ownerHash !== ownerHash'), 'El endpoint de estado comprueba la propiedad de la tarea');
requireCheck(status.includes('https://stablehorde.net/api/v2/generate/check/'), 'El estado consulta la cola de generación');
requireCheck(status.includes('https://stablehorde.net/api/v2/generate/status/'), 'El resultado recupera la imagen mediante el endpoint de estado');
requireCheck(status.includes("imageUrl.protocol !== 'https:'"), 'El backend rechaza URL de imagen sin HTTPS');
requireCheck(source.includes("path === '/air-flow/create/image/status'"), 'La ruta de seguimiento de tareas está registrada');
requireCheck(source.includes('function pollStableHorde(requestId,statusEl)'), 'La interfaz consulta el progreso y permite continuar la espera');
requireCheck(source.includes('env.STABLE_HORDE_API_KEY'), 'La integración usa el secreto del servidor, no un valor del cliente');

const appStart = source.indexOf('const AF_APP_JS = "');
const appEnd = source.indexOf('";\n\nasync function handleAirFlowAppJs', appStart);
if (appStart < 0 || appEnd < 0) throw new Error('FALLO: no se pudo aislar el JavaScript del cliente para revisarlo');
const clientScript = source.slice(appStart, appEnd);
if (clientScript.includes('STABLE_HORDE_API_KEY')) throw new Error('FALLO: la variable de la clave no debe aparecer en el código del cliente');

console.log('✅ Comprobaciones estáticas del flujo Stable Horde superadas; no se consumió API ni cuota de generación.');
