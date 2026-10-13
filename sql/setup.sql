-- Extensão usada na busca por semelhança
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente     varchar(150)   NOT NULL,
  descricao   varchar(255)   NOT NULL,
  valor       numeric(12,2)  NOT NULL,
  marca       varchar(100),
  referencia  varchar(100),
  estoque     integer        NOT NULL
);
