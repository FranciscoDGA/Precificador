# Precificador Pro | Aplicativo & Página de Vendas para Marketplaces

Solução completa de software para sellers de marketplaces (Mercado Livre, Amazon, Shopee, Shein, TikTok Shop e Magalu):
- **Página de Vendas Sofisticada e Minimalista (`index.html`)** com simulador interativo na hero, comparativo, quebra de objeções e checkout integrado à Hotmart.
- **Aplicativo Mobile-First Instalável (`app.html`)**: PWA com suporte a instalação no celular, 100% offline e com dados salvos no próprio aparelho do usuário.
- **Páginas Institucionais Obrigatórias**: Políticas de Privacidade (LGPD), Termos de Uso, Sobre Nós e Contato/Suporte.
- **Sistema de Licenciamento Hotmart**: Ativação com código de transação `HP...` para liberação do Plano Pro.
- **Pronto para APK**: Guia e estrutura para compilar em `.apk` Android via PWABuilder ou Capacitor.
- **Deploy na Vercel**: Configurado com `vercel.json` para deploy com 1 clique.

---

## 🚀 Como testar localmente

Você pode abrir diretamente o arquivo `index.html` ou `app.html` no navegador, ou rodar um servidor local com Node.js:

```bash
npx serve .
```

Acesse no navegador: `http://localhost:3000`

---

## 📦 Como Subir para o GitHub

1. Abra o terminal na pasta do projeto:
```bash
git init
git add .
git commit -m "feat: Precificador Pro v2.1 com PWA, Landing Page e Hotmart"
```

2. Crie um novo repositório no seu [GitHub](https://github.com/new) chamado `precificador-pro`.

3. Vincule e envie o código:
```bash
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/precificador-pro.git
git push -u origin main
```

---

## ⚡ Como Fazer o Deploy na Vercel (Gratuito)

1. Acesse [vercel.com](https://vercel.com/) e faça login com seu GitHub.
2. Clique em **"Add New..." > "Project"**.
3. Selecione o repositório `precificador-pro` que você acabou de subir.
4. Clique em **"Deploy"** (a Vercel detectará automaticamente o `vercel.json`).
5. Em poucos segundos, sua página de vendas e aplicativo estarão online com HTTPS gratuito e velocidade ultra-rápida.

---

## 🛒 Como Conectar com o Seu Produto na Hotmart

1. Cadastre seu produto na Hotmart (tipo: Software / Aplicativo / Conteúdo Digital).
2. Copie o seu link de checkout da Hotmart (ex: `https://pay.hotmart.com/ABC123456?checkoutMode=10`).
3. Abra os arquivos `index.html` e `app.html` e substitua `https://pay.hotmart.com/YOUR_HOTMART_CODE?checkoutMode=10` pelo seu link real.
4. Quando seu cliente comprar na Hotmart, ele receberá o e-mail da Hotmart com o código de transação (ex: `HP0123456789`).
5. Ao entrar no aplicativo e clicar em **"Ativar Pro"**, basta inserir o código para desbloquear os recursos ilimitados no celular ou computador.

---

## 📱 Como Gerar o APK do Aplicativo

Consulte o arquivo [`android-guide.md`](./android-guide.md) para o passo a passo com **PWABuilder** (1 clique online) ou **Capacitor** (compilação nativa no Android Studio).
