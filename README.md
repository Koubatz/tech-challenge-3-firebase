# API de Funções Bancárias com Firebase

Este projeto implementa uma API RESTful para simular operações bancárias básicas, utilizando Firebase Cloud Functions (v2) e Firestore como banco de dados.

A API permite criar contas, realizar depósitos e saques, consultar saldos e visualizar extratos.

---

## 🚀 Tecnologias Utilizadas

- **Firebase Cloud Functions (v2):** Backend serverless para a lógica da API.
- **Firestore:** Banco de dados NoSQL para armazenar dados de contas e transações.
- **TypeScript:** Linguagem principal para o desenvolvimento das funções.
- **Firebase Emulator Suite:** Para desenvolvimento e testes locais.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas em sua máquina:

- [Node.js](https://nodejs.org/en/) (versão 18 ou superior)
- [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli)

---

## ⚙️ Configuração do Ambiente Local

Siga os passos abaixo para configurar e rodar o projeto em seu ambiente de desenvolvimento.

### 1. Clone o Repositório

```bash
git clone <url-do-seu-repositorio>
cd tech-challenge-3-firebase
```

### 2. Instale as Dependências

As dependências do projeto estão localizadas no diretório `functions`.

```bash
cd functions
npm install
```

### 3. Configure as Variáveis de Ambiente

As funções utilizam um arquivo `.env` para gerenciar segredos.

a. Navegue até o diretório `functions`.
b. Crie uma cópia do arquivo de exemplo `.env.example`:

```bash
cp .env.example .env
```

c. Abra o novo arquivo `.env` e defina o valor para a variável `CREATE_ACCOUNT_SECRET`. Para desenvolvimento, você pode usar o valor padrão:

```
# functions/.env
CREATE_ACCOUNT_SECRET="your-secret-password"
```

---

## ▶️ Rodando o Projeto com Emuladores

### 1. Compile o Código TypeScript

Ainda no diretório `functions`, execute o comando para transpilar o código TypeScript para JavaScript:

```bash
npm run build
```

### 2. Inicie os Emuladores do Firebase

Volte para a raiz do projeto e inicie o Firebase Emulator Suite:

```bash
cd ..
firebase emulators:start
```

Após a inicialização, você verá os logs dos emuladores no terminal. A API estará disponível localmente, e você poderá acessar a UI dos emuladores em http://127.0.0.1:4000.

---

## 📚 Documentação da API

A API expõe funções para:
- verificar disponibilidade do serviço (`healthCheck`);
- criar e consultar contas (`createBankAccount`, `getAccountDetails`);
- realizar e analisar transações bancárias (`performTransaction`, `getAccountStatement`, `getYearlyTransactions`);
- gerenciar cartões (`listPaymentCards`, `createPaymentCard`, `getPaymentCardTransactions`, `deletePaymentCard`).

Para uma descrição detalhada de cada função, exemplos de requisição/resposta, parâmetros opcionais (como o filtro de tipo de transação em `getAccountStatement`) e códigos de erro, consulte a **Documentação da API**.

---

## 🧪 Testando com Postman

O projeto inclui duas coleções do Postman:
- `firebase-local.postman_collection.json` para uso com o Firebase Emulator Suite;
- `firebase-prod.postman_collection.json` com os mesmos cenários apontando para o ambiente hospedado.

Ambas trazem requisições já configuradas para autenticação, operações bancárias, consultas de extrato (com o parâmetro opcional `transactionType`) e todo o fluxo de cartões. Importe os arquivos no Postman/Insomnia para começar a testar imediatamente.
