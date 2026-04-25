# FreelanceDoc — Guia do Usuário

## O que é o FreelanceDoc?

FreelanceDoc é uma ferramenta para **freelancers** criarem, gerenciarem e enviarem **propostas e contratos** de serviço de forma profissional.

Se você é designer, desenvolvedor, redator, consultor ou qualquer outro tipo de profissional autônomo, o FreelanceDoc te ajuda a:

- Criar modelos reutilizáveis de propostas e contratos
- Gerar documentos personalizados para cada cliente
- Enviar os documentos por e-mail diretamente pela plataforma
- Fazer o download em PDF
- Acompanhar o status de cada documento (Rascunho, Enviado, Aceito, Recusado, Expirado)

---

## Primeiros passos

### 1. Criar uma conta

Acesse a tela de cadastro e preencha:

- **Nome completo**
- **E-mail** — será usado para fazer login
- **Senha** — mínimo de 8 caracteres

Após se cadastrar, você será redirecionado automaticamente para o painel.

### 2. Fazer login

Na tela de login, informe seu e-mail e senha. Se as credenciais estiverem corretas, você acessa o painel. Caso erre a senha, uma mensagem de erro será exibida e você pode tentar novamente.

---

## Telas do sistema

### Modelos (`/templates`)

Modelos são a base para criar documentos. Pense neles como um "formulário padrão" que você reutiliza para diferentes clientes.

**O que você pode fazer aqui:**

- Ver todos os seus modelos cadastrados
- Cada modelo mostra o nome, o tipo (Proposta ou Contrato) e a data de criação
- Criar um novo modelo clicando em **"Novo modelo"**
- Editar um modelo existente clicando no ícone de lápis
- Excluir um modelo clicando no ícone de lixeira (uma confirmação será pedida)

**Tipos de modelo:**

| Tipo | Descrição |
|------|-----------|
| **Proposta** | Documento enviado antes de fechar negócio, descrevendo o serviço e o valor |
| **Contrato** | Documento formal que formaliza o acordo após aceite da proposta |

---

### Criar / Editar modelo (`/templates/new` e `/templates/[id]/edit`)

Ao criar ou editar um modelo, você preenche:

- **Nome do modelo** — ex: "Proposta de Desenvolvimento Web"
- **Tipo** — Proposta ou Contrato
- **Conteúdo** — o corpo do documento em formato de blocos (títulos, parágrafos, preços)

Você pode usar **variáveis** no conteúdo entre chaves duplas, que serão substituídas automaticamente na hora de gerar um documento:

| Variável | O que representa |
|----------|-----------------|
| `{{project_name}}` | Nome do projeto |
| `{{client_name}}` | Nome do cliente |
| `{{total_value}}` | Valor total do serviço |
| `{{currency}}` | Moeda (ex: BRL) |
| `{{valid_until}}` | Data de validade |

---

### Documentos (`/documents`)

Documentos são instâncias concretas geradas a partir de um modelo para um cliente específico.

**O que você pode fazer aqui:**

- Ver todos os documentos criados
- Filtrar por status (Todos, Rascunho, Enviado, Aceito, Recusado, Expirado)
- Criar um novo documento clicando em **"Novo documento"**
- Abrir um documento para ver detalhes, enviar ou baixar
- Excluir um documento (somente se estiver em Rascunho)

**Status dos documentos:**

| Status | Significado |
|--------|-------------|
| **Rascunho** | Criado mas ainda não enviado ao cliente. Pode ser editado. |
| **Enviado** | Enviado ao cliente por e-mail. Não pode mais ser editado. |
| **Aceito** | O cliente aceitou. |
| **Recusado** | O cliente recusou. |
| **Expirado** | O prazo de validade passou. |

---

### Criar novo documento (`/documents/new`)

Para criar um documento você preenche:

- **Título** — ex: "Proposta de Redesign — Empresa X"
- **Modelo base** — escolhe um dos seus modelos cadastrados (opcional)
- **Nome do cliente**
- **E-mail do cliente**
- **Documento do cliente** (CPF/CNPJ — opcional)
- **Valor total** e **moeda**
- **Validade** — data até quando a proposta/contrato é válido
- **Conteúdo** — os blocos de texto do documento, já pré-preenchidos pelo modelo se você escolheu um

---

### Detalhe do documento (`/documents/[id]`)

Ao abrir um documento você vê:

- Todas as informações do documento (título, cliente, valor, status, validade)
- O conteúdo completo em blocos
- O histórico de versões (cada vez que o documento é atualizado, uma versão é salva)

**Ações disponíveis:**

| Ação | Quando disponível |
|------|------------------|
| **Enviar por e-mail** | Somente quando status for Rascunho |
| **Baixar PDF** | Sempre |
| **Alterar status** | Depende do status atual (veja tabela abaixo) |

**Transições de status permitidas:**

```
Rascunho → Enviado
Enviado  → Aceito / Recusado / Expirado
```

Ao clicar em **Enviar**, uma janela abre pedindo o e-mail do destinatário (pode ser diferente do e-mail cadastrado do cliente). O sistema envia o documento e muda o status para **Enviado** automaticamente.

---

### Perfil (`/profile`)

Nesta tela você gerencia suas informações pessoais e profissionais:

**Dados pessoais/profissionais:**
- Nome completo
- Nome profissional (ex: "Studio XYZ" — aparece nos documentos)
- CPF ou CNPJ
- Telefone
- Endereço

**Alterar senha:**
- Informe a senha atual
- Digite a nova senha (mínimo 8 caracteres)
- Confirme a nova senha

---

## Fluxo típico de uso

```
1. Cadastre-se e faça login
        ↓
2. Crie um modelo (ex: "Proposta Padrão")
        ↓
3. Crie um documento a partir do modelo para o cliente X
        ↓
4. Revise o conteúdo do documento
        ↓
5. Envie por e-mail ao cliente
        ↓
6. Atualize o status conforme a resposta do cliente
   (Aceito ou Recusado)
```

---

## Perguntas frequentes

**Posso usar o mesmo modelo para vários clientes?**
Sim. Um modelo é reutilizável. Cada cliente recebe um documento separado gerado a partir do mesmo modelo.

**Posso editar um documento após enviá-lo?**
Não. Uma vez enviado, o documento é bloqueado para edição para garantir a integridade do registro. Se precisar de ajustes, crie um novo documento.

**O que acontece com o histórico de versões?**
Cada atualização no conteúdo de um documento salva uma nova versão. Você pode ver o histórico na tela de detalhe do documento.

**Posso excluir um documento enviado?**
Não. Documentos enviados são registros permanentes e não podem ser excluídos.
