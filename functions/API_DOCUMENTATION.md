### **API de Funções Bancárias - Documentação para Desenvolvedores Frontend**

#### **Introdução**

Esta documentação descreve como interagir com a API de Funções Bancárias baseada em Firebase Cloud Functions. A API fornece endpoints para criar contas bancárias, consultar saldos, visualizar extratos e realizar transações como depósitos e saques.

Todas as funções são do tipo "Callable Functions" do Firebase, o que significa que todas as interações são feitas via requisições `POST` HTTPS com um corpo de requisição e resposta padronizado.

---

#### **URL Base**

Para o ambiente de desenvolvimento local usando o Firebase Emulator Suite, a URL base é:

`http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/`

Para produção, a URL seguirá o formato:

`https://<region>-<project-id>.cloudfunctions.net/`

---

#### **Formato da Requisição e Resposta**

As "Callable Functions" têm um formato de requisição e resposta específico.

**Requisição:**

*   **Método:** `POST`
*   **Header:** `Content-Type: application/json`
*   **Corpo (Body):** Um objeto JSON contendo uma chave `data`, cujo valor é o objeto com os parâmetros da função.

```json
{
  "data": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Resposta de Sucesso (200 OK):**

A resposta será um objeto JSON contendo uma chave `result`, cujo valor é o objeto retornado pela função.

```json
{
  "result": {
    "success": true,
    "key1": "value1"
  }
}
```

**Resposta de Erro:**

Erros de validação, permissão ou outros erros controlados retornarão um status HTTP `4xx` ou `5xx` com um corpo JSON detalhando o erro.

```json
{
  "error": {
    "code": "invalid-argument",
    "message": "A mensagem de erro específica.",
    "details": null
  }
}
```

---

#### **Autenticação e Gerenciamento de Sessão**

Todos os endpoints (exceto `healthCheck`) são protegidos e exigem que a requisição seja feita por um usuário autenticado via Firebase Authentication. O fluxo de autenticação utiliza dois tipos de tokens para garantir segurança e uma boa experiência do usuário:

1.  **ID Token (`idToken`):**
    *   **Função:** É um token de curta duração (expira em 1 hora) que prova a identidade do usuário.
    *   **Uso:** Deve ser enviado no cabeçalho `Authorization` de cada chamada para os endpoints da API (`createBankAccount`, `performTransaction`, etc.).
    *   **Exemplo de Header:** `Authorization: Bearer <seu-firebase-id-token>`

2.  **Refresh Token (`refreshToken`):**
    *   **Função:** É um token de longa duração, recebido junto com o ID Token no momento do login. Sua única finalidade é ser trocado por um novo ID Token quando o antigo expirar.
    *   **Uso:** É enviado para um endpoint específico da API de autenticação do Firebase para renovar a sessão do usuário sem que ele precise digitar suas credenciais novamente.

**Fluxo de Trabalho do Cliente (Frontend):**

1.  O usuário faz login com e-mail e senha.
2.  O cliente recebe e armazena de forma segura tanto o `idToken` quanto o `refreshToken`.
3.  Para cada chamada à API, o cliente envia o `idToken` no cabeçalho.
4.  Quando uma chamada falha com um erro de "não autenticado" (geralmente após 1 hora), significa que o `idToken` expirou.
5.  Nesse momento, o cliente usa o `refreshToken` para solicitar um novo `idToken` à API do Firebase.
6.  O cliente substitui o `idToken` antigo pelo novo e tenta novamente a chamada que falhou.

**Nota para Desenvolvedores:** Ao usar os SDKs oficiais do Firebase para Web (`firebase/auth`), grande parte desse fluxo de atualização de token é gerenciada automaticamente. A documentação abaixo descreve as chamadas REST diretas, que são úteis para testes (como no Postman) ou para integrações sem o SDK do cliente.

---

#### **Endpoints de Autenticação (Firebase REST API)**

Estes endpoints não são Cloud Functions do projeto, mas sim endpoints da API REST do próprio Firebase Authentication, usados para obter e atualizar tokens.

##### **A. Login com E-mail e Senha**

Obtém o `idToken` e o `refreshToken` iniciais.

*   **Endpoint:** `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`
*   **Método:** `POST`
*   **Query Params:** `key=<sua-api-key-do-firebase>`

**Requisição:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha-do-usuario",
  "returnSecureToken": true
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "kind": "identitytoolkit#VerifyPasswordResponse",
  "localId": "...",
  "email": "usuario@exemplo.com",
  "displayName": "",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "registered": true,
  "refreshToken": "AEu4IL8...",
  "expiresIn": "3600"
}
```
*   **Ação:** Armazene o `idToken` e o `refreshToken`.

##### **B. Atualizar ID Token (Refresh Token)**

Usa o `refreshToken` para obter um novo `idToken`.

*   **Endpoint:** `https://securetoken.googleapis.com/v1/token`
*   **Método:** `POST`
*   **Query Params:** `key=<sua-api-key-do-firebase>`

**Requisição:**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "<seu-refresh-token-armazenado>"
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "expires_in": "3600",
  "token_type": "Bearer",
  "refresh_token": "AEu4IL8...",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "user_id": "...",
  "project_id": "..."
}
```
*   **Ação:** Substitua o `idToken` antigo pelo novo valor de `id_token`. O `refresh_token` também pode ser atualizado se um novo for retornado.

---

#### **Endpoints da API da Aplicação**

A seguir estão os detalhes de cada endpoint disponível.

##### **1. Health Check**

Verifica a saúde da API e a conectividade com o banco de dados Firestore.

*   **Nome da Função:** `healthCheck`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/healthCheck`
*   **Descrição:** Realiza uma operação de escrita simples no Firestore para confirmar que o serviço está operacional.

**Requisição:**

```json
{
  "data": {}
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "docId": "YgVv5h2gS3jK4lPqWn8r"
  }
}
```

| Campo     | Tipo      | Descrição                                     |
| :-------- | :-------- | :-------------------------------------------- |
| `success` | `boolean` | `true` se a verificação foi bem-sucedida.     |
| `docId`   | `string`  | O ID do documento de verificação criado no Firestore. |

---

##### **2. Criar Conta Bancária**

Cria uma nova conta bancária com um saldo inicial zerado.

*   **Nome da Função:** `createBankAccount`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/createBankAccount`
*   **Descrição:** Registra uma nova conta no sistema, gerando um número de conta único. A agência é fixada em `"0001"`.

**Requisição (`data`):**

| Parâmetro   | Tipo     | Obrigatório | Descrição                                                              |
| :---------- | :------- | :---------- | :--------------------------------------------------------------------- |
| `ownerName` | `string` | Sim         | Nome completo do titular da conta. O saldo inicial será sempre zero.   |

**Exemplo de Requisição:**

```json
{
  "data": {
    "ownerName": "Jane Doe"
  }
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "docId": "aBcDeFgHiJkLmNoPqRsT",
    "accountNumber": "000001-5"
  }
}
```

| Campo           | Tipo      | Descrição                                         |
| :-------------- | :-------- | :------------------------------------------------ |
| `success`       | `boolean` | `true` se a conta foi criada com sucesso.         |
| `docId`         | `string`  | O ID do documento da conta no Firestore.          |
| `accountNumber` | `string`  | O número da conta gerado (formato `NNNNNN-D`).    |

---

##### **3. Realizar Transação (Depósito/Saque)**

Realiza um depósito ou um saque em uma conta bancária existente.

*   **Nome da Função:** `performTransaction`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/performTransaction`
*   **Descrição:** Modifica o saldo da conta vinculada ao usuário autenticado e registra a transação.

**Requisição (`data`):**

| Parâmetro | Tipo     | Obrigatório | Descrição                                                              |
| :-------- | :------- | :---------- | :--------------------------------------------------------------------- |
| `amount`  | `number` | Sim         | Valor da transação. Deve ser um número positivo (ex: `100.50`).        |
| `type`    | `string` | Sim         | Tipo da transação. Valores permitidos: `"DEPOSIT"` ou `"WITHDRAWAL"`. |
| `timestamp` | `string` ou `number` | Não | Data/hora opcional da transação (ISO 8601 ou epoch em milissegundos). Quando omitido, o horário do servidor é utilizado. |
| `category` | `string` | Não         | Categoria opcional da transação (máximo de 100 caracteres).            |

**Exemplo de Requisição (Depósito):**

```json
{
  "data": {
    "amount": 100.50,
    "type": "DEPOSIT",
    "timestamp": "2024-03-15T14:30:00.000Z",
    "category": "Salário"
  }
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "transactionId": "uVwXyZaBcDeFgHiJkLmN",
    "newBalance": 100.50
  }
}
```

| Campo           | Tipo      | Descrição                                                              |
| :-------------- | :-------- | :--------------------------------------------------------------------- |
| `success`       | `boolean` | `true` se a transação foi bem-sucedida.                                |
| `transactionId` | `string`  | O ID do documento da transação no Firestore.                           |
| `newBalance`    | `number`  | O novo saldo da conta após a transação, em formato decimal.            |

**Erros Comuns:**

*   `failed-precondition`: Saldo insuficiente para realizar um saque (`WITHDRAWAL`).
*   `not-found`: Nenhuma conta foi encontrada para o usuário autenticado.

---

##### **4. Consultar Detalhes da Conta**

Busca os detalhes de uma conta bancária, incluindo o saldo atual.

*   **Nome da Função:** `getAccountDetails`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/getAccountDetails`
*   **Descrição:** Retorna informações do titular e o saldo atual da conta vinculada ao usuário autenticado.

**Requisição (`data`):** Esta função não requer parâmetros. Envie um objeto vazio (`{}`) caso a plataforma exija.

**Exemplo de Requisição:**

```json
{
  "data": {}
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "accountNumber": "000001-5",
    "agency": "0001",
    "ownerName": "Jane Doe",
    "balance": 1601.25
  }
}
```

| Campo           | Tipo      | Descrição                             |
| :-------------- | :-------- | :------------------------------------ |
| `success`       | `boolean` | `true` se a consulta foi bem-sucedida. |
| `accountNumber` | `string`  | Número da conta.                      |
| `agency`        | `string`  | Número da agência.                    |
| `ownerName`     | `string`  | Nome do titular.                      |
| `balance`       | `number`  | Saldo atual em formato decimal.       |

---

##### **5. Obter Extrato da Conta**

Busca o histórico de transações de uma conta bancária.

*   **Nome da Função:** `getAccountStatement`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/getAccountStatement`
*   **Descrição:** Retorna uma lista de todas as transações associadas a uma conta, ordenadas da mais recente para a mais antiga. Apenas o usuário autenticado titular da conta consegue consultar estas informações.

**Requisição (`data`):**

| Parâmetro  | Tipo     | Obrigatório | Descrição                                                      |
| :--------- | :------- | :---------- | :------------------------------------------------------------- |
| `page`     | `number` | Não         | Página a ser retornada (>= 1). Padrão: `1`.                    |
| `pageSize` | `number` | Não         | Quantidade de registros por página (entre 1 e 50). Padrão: `10`. |

**Exemplo de Requisição:**

```json
{
  "data": {
    "page": 1,
    "pageSize": 10
  }
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "page": 1,
    "pageSize": 10,
    "hasMore": true,
    "transactions": [
      {
        "id": "uVwXyZaBcDeFgHiJkLmN",
        "type": "DEPOSIT",
        "amount": 100.50,
        "timestamp": "2023-10-27T10:30:00.000Z",
        "newBalance": 1601.25
      },
      {
        "id": "oPqRsTuVwXyZaBcDeFgH",
        "type": "WITHDRAWAL",
        "amount": 50.00,
        "timestamp": "2023-10-26T15:00:00.000Z",
        "newBalance": 1500.75
      }
    ]
  }
}
```

| Campo          | Tipo            | Descrição                                                                          |
| :------------- | :-------------- | :--------------------------------------------------------------------------------- |
| `success`      | `boolean`       | `true` se a consulta foi bem-sucedida.                                             |
| `page`         | `number`        | Página retornada.                                                                  |
| `pageSize`     | `number`        | Quantidade de registros solicitada para cada página.                               |
| `hasMore`      | `boolean`       | Indica se há mais páginas a serem consultadas.                                     |
| `transactions` | `Array<Object>` | Uma lista de objetos de transação. A lista estará vazia se não houver transações. |

**Estrutura do Objeto de Transação:**

| Campo        | Tipo     | Descrição                                           |
| :----------- | :------- | :-------------------------------------------------- |
| `id`         | `string` | ID da transação.                                    |
| `type`       | `string` | `"DEPOSIT"` ou `"WITHDRAWAL"`.                      |
| `amount`     | `number` | Valor da transação em formato decimal.              |
| `timestamp`  | `string` | Data e hora da transação em formato ISO 8601.       |
| `newBalance` | `number` | Saldo da conta *após* esta transação.               |
| `category`   | `string` ou `null` | Categoria associada à transação, quando informada. |

---

##### **6. Obter Transações do Ano Agrupadas por Mês**

Retorna todas as transações realizadas pelo usuário autenticado em um ano específico, agrupadas por mês.

*   **Nome da Função:** `getYearlyTransactions`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/getYearlyTransactions`
*   **Descrição:** Lista as transações da conta vinculada ao usuário para um ano informado (ou o ano atual, se omitido) e organiza os resultados por mês.

**Requisição (`data`):**

| Parâmetro        | Tipo     | Obrigatório | Descrição                                                                                 |
| :--------------- | :------- | :---------- | :---------------------------------------------------------------------------------------- |
| `year`           | `number` | Não         | Ano desejado (por exemplo, `2024`). Se omitido, o ano corrente em UTC é utilizado.        |
| `accountNumber`  | `string` | Não         | Número da conta a consultar. Se informado, deve corresponder à conta do usuário logado.   |

**Exemplo de Requisição:**

```json
{
  "data": {
    "year": 2024
  }
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "year": 2024,
    "months": [
      {
        "month": 1,
        "transactions": [
          {
            "id": "abc123",
            "type": "DEPOSIT",
            "amount": 150.75,
            "timestamp": "2024-01-05T12:01:00.000Z",
            "newBalance": 2100.50
          }
        ]
      },
      {
        "month": 2,
        "transactions": []
      }
    ]
  }
}
```

| Campo      | Tipo              | Descrição                                                                                     |
| :--------- | :---------------- | :-------------------------------------------------------------------------------------------- |
| `success`  | `boolean`         | `true` quando a consulta estiver concluída com êxito.                                         |
| `year`     | `number`          | Ano utilizado para a consulta.                                                                |
| `months`   | `Array<Object>`   | Lista ordenada por mês (1 a 12). Cada item contém o mês e o array de transações desse período. |

**Observações:**

*   Apenas a conta vinculada ao usuário autenticado pode ser consultada.
*   Meses sem transações retornam com o array `transactions` vazio.
*   É necessário possuir um índice composto no Firestore para `transactions` combinando `accountNumber` e `timestamp`.

---

##### **6. Listar Cartões**

Retorna todos os cartões vinculados à conta bancária do usuário autenticado.

*   **Nome da Função:** `listPaymentCards`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/listPaymentCards`
*   **Descrição:** Lista todos os cartões (crédito, débito, físico ou virtual) associados à conta do usuário.

**Requisição (`data`):** Esta função não requer parâmetros. Envie um objeto vazio (`{}`) caso a plataforma exija.

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
        "success": true,
        "cards": [
          {
            "id": "P1q2W3e4R5t6",
            "cardType": "CREDIT",
            "brand": "ByteBank",
            "label": "Cartão de crédito",
            "maskedNumber": "**** **** **** 1234",
            "lastFourDigits": "1234",
            "invoiceAmount": 0,
            "invoiceDueDate": "15",
            "availableLimit": 2500,
            "creditLimit": 2500,
            "createdAt": "2024-10-20T12:00:00.000Z",
            "updatedAt": "2024-10-20T12:00:00.000Z"
          }
        ]
      }
}
```

| Campo     | Tipo            | Descrição                                                                 |
| :-------- | :-------------- | :------------------------------------------------------------------------ |
| `success` | `boolean`       | `true` quando a listagem é concluída com êxito.                           |
| `cards`   | `Array<Object>` | Lista de cartões vinculados ao usuário. Pode ser vazia se não houver cartões. |

**Erros Comuns:**

*   `not-found`: Nenhuma conta bancária foi encontrada para o usuário autenticado.

---

##### **7. Criar Cartão**

Cria um novo cartão (crédito, débito, físico ou virtual) vinculado à conta do usuário autenticado.

*   **Nome da Função:** `createPaymentCard`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/createPaymentCard`
*   **Descrição:** Gera um novo cartão com dados básicos (número mascarado, limites padrão e fatura inicial zerada). Ao criar um cartão de crédito, algumas transações de exemplo podem ser adicionadas automaticamente para fins de demonstração.

**Requisição (`data`):**

| Parâmetro | Tipo     | Obrigatório | Descrição                                                                              |
| :-------- | :------- | :---------- | :------------------------------------------------------------------------------------- |
| `type`    | `string` | Sim         | Tipo do cartão. Valores permitidos: `"CREDIT"`, `"DEBIT"`, `"PHYSICAL"` ou `"VIRTUAL"`. |
| `label`   | `string` | Não         | Rótulo amigável exibido ao usuário. Máximo de 80 caracteres.                           |
| `brand`   | `string` | Não         | Marca do cartão (ex.: `"Visa"`). Quando omitido, assume o valor `"ByteBank"`.          |

**Exemplo de Requisição:**

```json
{
  "data": {
    "type": "CREDIT",
    "label": "Cartão de crédito principal",
    "brand": "Visa"
  }
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "message": "Cartão criado com sucesso.",
      "card": {
        "id": "W7x8Y9z0A1b2",
        "cardType": "CREDIT",
        "brand": "Visa",
        "label": "Cartão de crédito principal",
        "maskedNumber": "**** **** **** 5678",
        "lastFourDigits": "5678",
        "invoiceAmount": 0,
        "invoiceDueDate": "15",
        "availableLimit": 2500,
        "creditLimit": 2500,
        "createdAt": "2024-10-21T09:30:00.000Z",
        "updatedAt": "2024-10-21T09:30:00.000Z"
      }
    }
  }
```

**Erros Comuns:**

*   `unauthenticated`: Usuário não autenticado.
*   `failed-precondition`: Nenhuma conta bancária encontrada para o usuário.
*   `invalid-argument`: Tipo inválido ou campos excedendo o tamanho máximo permitido.

---

##### **8. Obter Transações do Cartão**

Retorna as transações mais recentes de um cartão específico.

*   **Nome da Função:** `getPaymentCardTransactions`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/getPaymentCardTransactions`
*   **Descrição:** Lista as movimentações registradas para o cartão informado, ordenadas da mais recente para a mais antiga.

**Requisição (`data`):**

| Parâmetro | Tipo     | Obrigatório | Descrição                                                      |
| :-------- | :------- | :---------- | :------------------------------------------------------------- |
| `cardId`  | `string` | Sim         | ID do cartão retornado pelas funções `listPaymentCards` ou `createPaymentCard`. |
| `limit`   | `number` | Não         | Quantidade máxima de registros a retornar (1 a 50). Padrão: `20`. |

**Exemplo de Requisição:**

```json
{
  "data": {
    "cardId": "P1q2W3e4R5t6",
    "limit": 10
  }
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "transactions": [
      {
        "id": "Tx123",
        "type": "CARD",
        "direction": "DEBIT",
        "description": "Compra em Mercado Central",
        "category": "groceries",
        "amount": 189.99,
        "timestamp": "2024-10-19T14:20:00.000Z"
      },
      {
        "id": "Tx124",
        "type": "CARD",
        "direction": "CREDIT",
        "description": "Pagamento da fatura",
        "category": "payment",
        "amount": 250,
        "timestamp": "2024-10-16T10:00:00.000Z"
      }
    ]
  }
}
```

**Erros Comuns:**

*   `not-found`: Cartão não encontrado.
*   `permission-denied`: O cartão não pertence ao usuário autenticado.
*   `invalid-argument`: Parâmetros inválidos (falta `cardId` ou `limit` fora do intervalo permitido).

---

##### **9. Excluir Cartão**

Remove um cartão existente e todas as transações associadas.

*   **Nome da Função:** `deletePaymentCard`
*   **URL:** `http://127.0.0.1:5001/fiap-tech-challenge-3-bytebank/us-central1/deletePaymentCard`
*   **Descrição:** Exclui o cartão pertencente ao usuário autenticado. Todas as transações armazenadas com o mesmo `cardId` são removidas.

**Requisição (`data`):**

| Parâmetro | Tipo     | Obrigatório | Descrição                                      |
| :-------- | :------- | :---------- | :--------------------------------------------- |
| `cardId`  | `string` | Sim         | ID do cartão retornado pelas funções de listagem/criação. |

**Exemplo de Requisição:**

```json
{
  "data": {
    "cardId": "DBsyTVIj0NUvHzk1n0SM"
  }
}
```

**Resposta de Sucesso (200 OK):**

```json
{
  "result": {
    "success": true,
    "removedTransactions": 3
  }
}
```

**Erros Comuns:**

*   `unauthenticated`: Usuário não autenticado.
*   `not-found`: Cartão inexistente.
*   `permission-denied`: O cartão pertence a outro usuário.
