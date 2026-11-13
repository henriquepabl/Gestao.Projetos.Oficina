-- Sprint 2: usuários/perfis, veículos e solicitações de agendamento.
-- PostgreSQL. Execute uma vez no banco do projeto.

BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    telefone        VARCHAR(20) NOT NULL,
    email           VARCHAR(254) NOT NULL,
    senha_hash      TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'client'
                    CHECK (role IN ('client', 'employee', 'admin')),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_lower_unique
    ON usuarios (LOWER(email));

CREATE TABLE IF NOT EXISTS veiculos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    marca           VARCHAR(80) NOT NULL,
    modelo          VARCHAR(100) NOT NULL,
    ano             SMALLINT NOT NULL CHECK (ano BETWEEN 1886 AND 2200),
    placa           VARCHAR(10) NOT NULL,
    quilometragem   INTEGER NOT NULL DEFAULT 0 CHECK (quilometragem >= 0),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT veiculos_placa_unique UNIQUE (placa),
    CONSTRAINT veiculos_id_usuario_unique UNIQUE (id, usuario_id)
);

CREATE TABLE IF NOT EXISTS agendamentos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    veiculo_id      BIGINT NOT NULL,
    atendente_id    BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    inicio          TIMESTAMPTZ NOT NULL,
    fim             TIMESTAMPTZ NOT NULL,
    descricao       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'solicitado'
                    CHECK (status IN (
                        'solicitado', 'confirmado', 'em_atendimento',
                        'concluido', 'cancelado', 'recusado'
                    )),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agendamentos_periodo_valido CHECK (fim > inicio),
    -- Garante no banco que o veículo pertence ao mesmo cliente do agendamento.
    CONSTRAINT agendamentos_veiculo_do_usuario_fk
        FOREIGN KEY (veiculo_id, usuario_id)
        REFERENCES veiculos (id, usuario_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS veiculos_usuario_id_idx ON veiculos (usuario_id);
CREATE INDEX IF NOT EXISTS agendamentos_usuario_inicio_idx
    ON agendamentos (usuario_id, inicio);
CREATE INDEX IF NOT EXISTS agendamentos_status_inicio_idx
    ON agendamentos (status, inicio);

CREATE OR REPLACE FUNCTION atualizar_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_atualizado_em ON usuarios;
CREATE TRIGGER trg_usuarios_atualizado_em
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();

DROP TRIGGER IF EXISTS trg_veiculos_atualizado_em ON veiculos;
CREATE TRIGGER trg_veiculos_atualizado_em
    BEFORE UPDATE ON veiculos
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();

DROP TRIGGER IF EXISTS trg_agendamentos_atualizado_em ON agendamentos;
CREATE TRIGGER trg_agendamentos_atualizado_em
    BEFORE UPDATE ON agendamentos
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();

COMMIT;
