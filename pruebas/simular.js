// Simulación automatizada de 3 pruebas de usuario (NO reemplaza pruebas con personas reales)
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('capturas', { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3300';
const MUESTRA = process.env.MUESTRA;
const resultados = [];
function sesion(persona) {
  const r = { ...persona, tareas: [] }; resultados.push(r);
  return async (id, nombre, criterio, fn, page) => {
    const t = { id, nombre, criterio, acciones: 0, ok: false, obs: [] }; const t0 = Date.now();
    const act = async (f) => { t.acciones++; return f(); };
    try { await fn({ act, obs: s => t.obs.push(s), t }); t.ok = t.ok || !t.fallo; }
    catch (e) { t.ok = false; t.obs.push('Error: ' + e.message.split('\n')[0]); }
    t.seg = +((Date.now() - t0) / 1000).toFixed(1);
    const shot = `capturas/${persona.clave}_${id}.png`; try { await page.screenshot({ path: shot }); t.captura = shot; } catch {}
    r.tareas.push(t); console.log(`${persona.clave} ${id} ${t.ok ? 'OK' : 'FALLA'} ${t.seg}s acciones=${t.acciones} ${t.obs.join(' | ')}`);
  };
}
async function login(page, act, u, pw) {
  await act(() => page.goto(BASE + '/'));
  await act(() => page.fill('#u', u)); await act(() => page.fill('#pw', pw)); await act(() => page.click('form button'));
  await page.waitForSelector('.top', { timeout: 8000 });
}
const toastTxt = async page => { try { await page.waitForSelector('.toast', { timeout: 4000 }); return (await page.locator('.toast').last().textContent()).trim(); } catch { return ''; } };

(async () => {
  const b = await chromium.launch();
  // ---------- Persona 1: Laura, líder de proyectos (editor), PC ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    const tarea = sesion({ clave: 'P1', nombre: 'Laura (simulada)', perfil: 'Líder de proyectos de I+D+i', rol: 'editor', dispositivo: 'PC 1440×900' });
    await tarea('T1', 'Iniciar sesión', 'Entra al tablero con su usuario', async ({ act }) => { await login(page, act, 'laura', 'Laura-Prueba-2026'); }, page);
    let pid;
    await tarea('T2', 'Crear un proyecto nuevo', 'El proyecto queda creado con plan Stage-Gate', async ({ act, obs, t }) => {
      await act(() => page.click('.top [data-act="nuevo-proyecto"]'));
      await page.waitForSelector('.modal #f_nombre');
      const nCampos = await page.locator('.modal .fld').count(); obs(`Formulario con ${nCampos} campos (solo 3 obligatorios)`);
      await act(() => page.fill('#f_nombre', 'Galleta alta en fibra con harina de plátano'));
      await act(() => page.fill('#f_linea', 'Panificación'));
      await act(() => page.click('.modal footer .btn.primary'));
      await page.waitForURL(/#\/proyecto\/\d+/, { timeout: 8000 });
      pid = page.url().match(/proyecto\/(\d+)/)[1]; obs(`Creado y abierto (id ${pid})`); t.ok = true;
    }, page);
    await tarea('T3', 'Agregar una actividad con responsable y fechas', 'La actividad aparece en el plan', async ({ act, obs, t }) => {
      await act(() => page.click('nav.tabs a:has-text("Actividades")'));
      await act(() => page.click('[data-act="nueva-act"]'));
      await page.waitForSelector('.modal #f_nombre');
      await act(() => page.fill('#f_nombre', 'Panel sensorial con cliente aliado'));
      await act(() => page.fill('#f_fecha_fin', '2026-11-20'));
      await act(() => page.click('.modal footer .btn.primary'));
      const msg = await toastTxt(page); obs(`Mensaje: «${msg}»`);
      await page.waitForTimeout(600);
      t.ok = await page.locator('text=Panel sensorial con cliente aliado').count() > 0; if (!t.ok) t.fallo = true;
    }, page);
    await tarea('T4', 'Identificar la ruta crítica del proyecto', 'Ve qué actividades son críticas', async ({ act, obs, t }) => {
      const crit = await page.locator('text=/crític/i').count(); obs(`${crit} referencias visibles a «crítica» en la pestaña`);
      await act(() => page.click('a[data-nav="cronograma"]')); await page.waitForTimeout(700);
      t.ok = crit > 0;
    }, page);
    resultados.at(-1).errores_js = errs; await ctx.close();
  }
  // ---------- Persona 2: Carlos, gerente/patrocinador (lector), celular ----------
  {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    const tarea = sesion({ clave: 'P2', nombre: 'Carlos (simulado)', perfil: 'Gerente / patrocinador', rol: 'lector', dispositivo: 'Celular 412×915' });
    await tarea('T1', 'Iniciar sesión desde el celular', 'Entra al tablero', async ({ act }) => { await login(page, act, 'carlos', 'Carlos-Prueba-2026'); }, page);
    await tarea('T2', 'Encontrar los proyectos en riesgo', 'Nombra los proyectos en rojo', async ({ act, obs, t }) => {
      await page.waitForSelector('a[href="#/detalle/salud"]');
      await act(() => page.locator('a[href="#/detalle/salud"]').first().click()); await page.waitForTimeout(900);
      const txt = await page.locator('#page').innerText(); const m = txt.match(/IDI-\d{3}/g) || [];
      obs(`Página de salud abierta; ${new Set(m).size} códigos de proyecto visibles`); t.ok = m.length > 0;
    }, page);
    await tarea('T3', 'Revisar las alertas que requieren decisión', 'Abre la lista priorizada', async ({ act, obs, t }) => {
      await act(() => page.click('[data-act="menu"]')); await page.waitForTimeout(300);
      await act(() => page.click('a[data-nav="alertas"]')); await page.waitForTimeout(900);
      const n = await page.locator('#page .al, #page li, #page tr').count(); obs(`${n} elementos en la vista de alertas`); t.ok = /alerta/i.test(await page.locator('#page').innerText());
    }, page);
    await tarea('T4', 'Intentar crear un proyecto (no debe poder)', 'El sistema impide el cambio y lo explica', async ({ act, obs, t }) => {
      const vis = await page.locator('[data-act="nuevo-proyecto"]:visible').count(); obs(`Botones «Nuevo proyecto» visibles para el lector: ${vis}`);
      if (vis) {
        await act(() => page.locator('[data-act="nuevo-proyecto"]:visible').first().click());
        await page.waitForSelector('.modal #f_nombre'); await act(() => page.fill('#f_nombre', 'Prueba lector'));
        await act(() => page.click('.modal footer .btn.primary')); const msg = await toastTxt(page); obs(`Tras llenar el formulario el sistema responde: «${msg}»`);
        t.ok = /solo lectura/i.test(msg); if (t.ok) obs('Hallazgo: el lector ve el botón y llena el formulario antes de saber que no tiene permiso');
      } else { obs('El lector no ve controles de edición'); t.ok = true; }
    }, page);
    resultados.at(-1).errores_js = errs; await ctx.close();
  }
  // ---------- Persona 3: Ana, analista de calidad (editor), PC ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    const tarea = sesion({ clave: 'P3', nombre: 'Ana (simulada)', perfil: 'Analista de calidad / regulatorio', rol: 'editor', dispositivo: 'Portátil 1366×768' });
    await tarea('T1', 'Iniciar sesión', 'Entra al tablero', async ({ act }) => { await login(page, act, 'ana', 'Ana-Prueba-2026x'); }, page);
    await tarea('T2', 'Subir un correo de avance de un cliente', 'El archivo se analiza y aparece una propuesta', async ({ act, obs, t }) => {
      await act(() => page.click('a[data-nav="documentos"]')); await page.waitForSelector('[data-drop]');
      const [fc] = await Promise.all([page.waitForEvent('filechooser'), act(() => page.click('[data-drop]'))]);
      await act(() => fc.setFiles(MUESTRA));
      await page.waitForSelector('.modal', { timeout: 20000 }); const tit = await page.locator('.modal header h3').textContent(); obs(`Se abrió: «${tit.trim()}»`); t.ok = true;
    }, page);
    await tarea('T3', 'Revisar y aplicar la propuesta de la IA', 'Los cambios se aplican tras su aprobación', async ({ act, obs, t }) => {
      const proy = await page.locator('#rv-proy').inputValue().catch(() => ''); obs(`Proyecto sugerido: ${proy || '(ninguno)'}`);
      const modo = await page.locator('.modal').innerText(); if (/local/i.test(modo)) obs('Análisis en modo local de respaldo (n8n no disponible en la simulación)');
      const checks = await page.locator('.modal input[type=checkbox]').count(); obs(`${checks} cambios propuestos con casilla de aprobación`);
      await act(() => page.click('.modal footer .btn.primary:has-text("Aplicar")')); const msg = await toastTxt(page); obs(`Mensaje: «${msg}»`); t.ok = !!msg && !/error|selecciona/i.test(msg); if (!t.ok) t.fallo = true;
    }, page);
    await tarea('T4', 'Verificar el registro en la bitácora', 'Ve el cambio con su origen', async ({ act, obs, t }) => {
      await page.waitForTimeout(800);
      const pidActual = (await page.url()).match(/proyecto\/(\d+)/);
      if (!pidActual) { await act(() => page.click('a[data-nav="proyectos"]')); await page.waitForTimeout(600); }
      // Navega como un usuario: busca el proyecto IDI-005 y abre la pestaña Bitácora
      await act(() => page.fill('#gs', 'IDI-005')); await page.waitForTimeout(500);
      await act(() => page.locator('#gres a').first().click()); await page.waitForTimeout(800);
      await act(() => page.click('nav.tabs a:has-text("Bitácora")')); await page.waitForTimeout(800);
      const filas = page.locator('#page table tbody tr:has(.chip:text-is("IA"))'); const n = await filas.count();
      obs(`${n} registros con origen «IA» en la bitácora de IDI-005`);
      if (n) obs('Primero: ' + (await filas.first().innerText()).replace(/\s+/g, ' ').slice(0, 150));
      t.ok = n > 0; if (!t.ok) t.fallo = true;
    }, page);
    resultados.at(-1).errores_js = errs; await ctx.close();
  }
  await b.close();
  fs.writeFileSync('resultados.json', JSON.stringify(resultados, null, 2));
})();
