/**
 * Agente de Automação RHiD - Irmãos Ubero
 * Este script deve ser executado em uma máquina local com Node.js e Playwright.
 * Ele automatiza o download do arquivo AFD do portal RHiD e envia para o processamento automático.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// CONFIGURAÇÕES - AJUSTE CONFORME NECESSÁRIO
const CONFIG = {
    rhid_url: 'https://www.rhid.com.br/login', // URL real do portal RHiD
    username: 'USUARIO_RHID',
    password: 'SENHA_RHID',
    supabase_fn_url: 'https://wtrefsziscauokudnxgz.supabase.co/functions/v1/process-afd',
    supabase_anon_key: 'VITE_SUPABASE_PUBLISHABLE_KEY_AQUI',
    obra_id: 'ID_DA_OBRA_VINCULADA_A_ESTE_RELOGIO',
};

async function run() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Iniciando login no RHiD...');
        await page.goto(CONFIG.rhid_url);
        
        // Exemplo de automação de login (ajustar seletores reais)
        await page.fill('input[name="username"]', CONFIG.username);
        await page.fill('input[name="password"]', CONFIG.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();

        console.log('Navegando para exportação AFD...');
        // Navegar até a tela de exportação AFD (ajustar seletores)
        await page.goto('https://www.rhid.com.br/relatorios/afd');
        
        // Configurar datas (ex: hoje)
        const hoje = new Date().toLocaleDateString('pt-BR');
        // await page.fill('#data_inicio', hoje);
        // await page.fill('#data_fim', hoje);

        console.log('Solicitando geração de arquivo...');
        const [ download ] = await Promise.all([
            page.waitForEvent('download'),
            page.click('#btn_gerar_afd'), // Botão que gera o download
        ]);

        const downloadPath = path.join(__dirname, 'temp_afd.txt');
        await download.saveAs(downloadPath);
        console.log('Arquivo AFD baixado com sucesso:', downloadPath);

        const fileContent = fs.readFileSync(downloadPath, 'utf-8');

        console.log('Enviando para Supabase Edge Function...');
        const response = await axios.post(CONFIG.supabase_fn_url, {
            obra_id: CONFIG.obra_id,
            file_content: fileContent,
            filename: `RHID_AUTO_${new Date().toISOString().split('T')[0]}.txt`
        }, {
            headers: {
                'Authorization': `Bearer ${CONFIG.supabase_anon_key}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Sucesso! Resposta da Function:', response.data);

        // Limpar arquivo temporário
        fs.unlinkSync(downloadPath);

    } catch (error) {
        console.error('Erro na automação:', error.message);
    } finally {
        await browser.close();
    }
}

run();
