-- Sprints 3–5: diagnóstico, orçamento, ordem de serviço, estoque e pagamentos.
-- PostgreSQL. Idempotente; depende da 001 (tabelas e função atualizar_data_atualizacao).

BEGIN;

-- RF04
CREATE TABLE IF NOT EXISTS diagnosticos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agendamento_id  BIGINT NOT NULL UNIQUE REFERENCES agendamentos(id) ON DELETE RESTRICT,
    mecanico_id     BIGINT NOT NULL REFERENCES usuarios(id),
    problemas       TEXT NOT NULL,
    recomendacoes   TEXT,
    km_registrado   INTEGER CHECK (km_registrado >= 0),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RF07
CREATE TABLE IF NOT EXISTS pecas (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo          VARCHAR(40) NOT NULL UNIQUE,
    nome            VARCHAR(150) NOT NULL,
    preco_venda     NUMERIC(10,2) NOT NULL CHECK (preco_venda >= 0),
    quantidade      INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    estoque_minimo  INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RF05
CREATE TABLE IF NOT EXISTS orcamentos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    diagnostico_id  BIGINT NOT NULL REFERENCES diagnosticos(id) ON DELETE RESTRICT,
    criado_por      BIGINT NOT NULL REFERENCES usuarios(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'aprovado', 'recusado', 'cancelado')),
    validade        DATE,
    observacoes     TEXT,
    respondido_em   TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orcamento_id    BIGINT NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    tipo            VARCHAR(15) NOT NULL CHECK (tipo IN ('peca', 'mao_de_obra')),
    peca_id         BIGINT REFERENCES pecas(id),
    descricao       VARCHAR(200) NOT NULL,
    quantidade      NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
    valor_unitario  NUMERIC(10,2) NOT NULL CHECK (valor_unitario >= 0),
    CONSTRAINT orcamento_itens_peca_coerente CHECK ((tipo = 'peca') = (peca_id IS NOT NULL))
);

-- RF06 (um mecânico responsável por OS)
CREATE TABLE IF NOT EXISTS ordens_servico (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orcamento_id    BIGINT NOT NULL UNIQUE REFERENCES orcamentos(id) ON DELETE RESTRICT,
    veiculo_id      BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
    mecanico_id     BIGINT REFERENCES usuarios(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'aberta'
                    CHECK (status IN ('aberta', 'em_execucao', 'aguardando_peca',
                                      'concluida', 'entregue', 'cancelada')),
    observacoes     TEXT,
    aberta_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concluida_em    TIMESTAMPTZ,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RF07: entradas/saídas; saída com os_id = peça usada na OS
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    peca_id         BIGINT NOT NULL REFERENCES pecas(id) ON DELETE RESTRICT,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade      INTEGER NOT NULL CHECK (quantidade > 0),
    os_id           BIGINT REFERENCES ordens_servico(id) ON DELETE RESTRICT,
    motivo          VARCHAR(200),
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mov_os_somente_saida CHECK (os_id IS NULL OR tipo = 'saida')
);

-- RF08: só registro; o recebimento acontece fora do sistema
CREATE TABLE IF NOT EXISTS pagamentos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    os_id           BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE RESTRICT,
    valor           NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    forma           VARCHAR(20) NOT NULL
                    CHECK (forma IN ('dinheiro', 'pix', 'cartao_debito',
                                     'cartao_credito', 'boleto', 'transferencia')),
    status          VARCHAR(15) NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'pago', 'cancelado')),
    pago_em         TIMESTAMPTZ,
    registrado_por  BIGINT NOT NULL REFERENCES usuarios(id),
    observacao      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pagamento_pago_tem_data CHECK ((status = 'pago') = (pago_em IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS orcamentos_diagnostico_idx ON orcamentos (diagnostico_id);
CREATE INDEX IF NOT EXISTS orcamento_itens_orcamento_idx ON orcamento_itens (orcamento_id);
CREATE INDEX IF NOT EXISTS os_veiculo_idx ON ordens_servico (veiculo_id);
CREATE INDEX IF NOT EXISTS os_status_idx ON ordens_servico (status);
CREATE INDEX IF NOT EXISTS mov_peca_idx ON movimentacoes_estoque (peca_id);
CREATE INDEX IF NOT EXISTS mov_os_idx ON movimentacoes_estoque (os_id);
CREATE INDEX IF NOT EXISTS pagamentos_os_idx ON pagamentos (os_id);

DROP TRIGGER IF EXISTS trg_pecas_atualizado_em ON pecas;
CREATE TRIGGER trg_pecas_atualizado_em BEFORE UPDATE ON pecas
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();
DROP TRIGGER IF EXISTS trg_orcamentos_atualizado_em ON orcamentos;
CREATE TRIGGER trg_orcamentos_atualizado_em BEFORE UPDATE ON orcamentos
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();
DROP TRIGGER IF EXISTS trg_os_atualizado_em ON ordens_servico;
CREATE TRIGGER trg_os_atualizado_em BEFORE UPDATE ON ordens_servico
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();

COMMIT;
