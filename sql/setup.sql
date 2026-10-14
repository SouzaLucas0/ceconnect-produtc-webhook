-- Extensão usada na busca por semelhança
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tabela de produtos
-- Um produto é único por cliente + código (código do sistema do cliente)
CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente     varchar(150)   NOT NULL,
  codigo      varchar(50)    NOT NULL,
  descricao   varchar(255)   NOT NULL,
  valor       numeric(12,2)  NOT NULL,
  marca       varchar(100),
  referencia  varchar(100),
  estoque     integer        NOT NULL,
  ativo       boolean        NOT NULL DEFAULT true,
  CONSTRAINT products_cliente_codigo_key UNIQUE (cliente, codigo)
);
