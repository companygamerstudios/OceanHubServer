import { workerSource as source, requireCheck } from './repo-audit-helpers.mjs';

requireCheck(source.includes('body.af-has-messages .welcome'), 'Air Flow oculta la bienvenida durante el chat activo');
requireCheck(source.includes('window.visualViewport.addEventListener'), 'La interfaz reacciona a cambios de altura del teclado virtual');
requireCheck(source.includes('env(safe-area-inset-bottom)'), 'El compositor respeta el área segura del dispositivo');
requireCheck(source.includes('enterkeyhint'), 'El campo de mensaje sugiere una tecla de enviar en dispositivos compatibles');
requireCheck(source.includes('touch-action:manipulation'), 'Los controles táctiles evitan retardo de interacción innecesario');
requireCheck(source.includes('function pollStableHorde(requestId,statusEl)'), 'La interfaz consulta el progreso de Stable Horde');
requireCheck(source.includes('function renderGeneratedImage(r,d)'), 'La interfaz renderiza resultados de más de un proveedor');
requireCheck(source.includes('data-mode'), 'Existen controles de selección de modos del chat');

console.log('✅ Chequeos estáticos de interfaz Air Flow superados.');
