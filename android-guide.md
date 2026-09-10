# Guia de Instalação Mobile & Geração de APK

O **Precificador Pro** foi arquitetado com padrões modernos de **PWA (Progressive Web App)** e arquitetura **Offline-First**, permitindo que ele seja executado tanto diretamente no navegador do smartphone quanto instalado como um aplicativo nativo (`.apk` para Android).

---

## Opção 1: Instalação Instantânea no Celular (Sem precisar de APK)

A maneira mais rápida e prática para você e seus clientes usarem no smartphone:

1. Publique o projeto na **Vercel** (ex: `https://seu-precificador.vercel.app`).
2. Abra o link no navegador do celular:
   - **No Android (Google Chrome):** Toque nos 3 pontinhos do canto superior direito e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
   - **No iPhone (Safari):** Toque no botão de Compartilhar (quadrado com seta) e selecione **"Adicionar à Tela de Início"**.
3. O aplicativo será instalado com o ícone do Precificador Pro na gaveta de aplicativos do celular, funcionando em tela cheia (standalone) e **100% offline**, mesmo sem sinal de internet.

---

## Opção 2: Gerar o APK com 1 Clique via PWABuilder (Recomendado)

O método oficial recomendado pela Microsoft e Google para transformar PWAs em `.apk` sem precisar instalar o Android Studio:

1. Faça o deploy na Vercel para obter a sua URL pública (ex: `https://meu-precificador.vercel.app`).
2. Acesse [PWABuilder.com](https://www.pwabuilder.com/).
3. Cole a URL do seu site e clique em **"Start"**.
4. O PWABuilder validará o `manifest.json` e o `sw.js` (que já deixamos 100% configurados no projeto).
5. Clique na aba **"Android"** e depois em **"Generate Package"**.
6. Selecione a opção **"Download APK"**.
7. Pronto! Você receberá o arquivo `.apk` pronto para instalar no seu celular ou disponibilizar como bônus de download para seus compradores na Hotmart.

---

## Opção 3: Compilação Nativa com Capacitor (Android Studio)

Se você preferir compilar manualmente o código-fonte nativo em Java/Kotlin:

### Pré-requisitos:
- Node.js instalado.
- Android Studio instalado com SDK Android atualizado.

### Passo a passo no terminal:
```bash
# 1. Instalar dependências do Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializar o projeto Capacitor
npx cap init "Precificador Pro" "com.precificadorpro.app" --web-dir .

# 3. Adicionar a plataforma Android
npx cap add android

# 4. Sincronizar os arquivos web para o Android
npx cap sync

# 5. Abrir o projeto no Android Studio
npx cap open android
```

No Android Studio:
- Vá em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- O arquivo `.apk` será gerado na pasta `android/app/build/outputs/apk/debug/app-debug.apk`.
