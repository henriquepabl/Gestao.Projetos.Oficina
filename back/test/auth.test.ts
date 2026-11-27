import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";


import { autenticar, dono, gerarToken, permitir } from "../src/middlewares/auth"; // lê JWT_SECRET do .env

function executar(middleware: (req: Request, res: Response, next: NextFunction) => unknown, request: Partial<Request>) {
  let status = 200;
  let chamouNext = false;
  const response = { status: (codigo: number) => ((status = codigo), response), json: () => response } as unknown as Response;
  middleware(request as Request, response, () => (chamouNext = true));
  return { status, chamouNext, request: request as Request };
}

const comToken = (token: string) => ({ headers: { authorization: `Bearer ${token}` } }) as Partial<Request>;

test("sem token → 401", () => {
  assert.equal(executar(autenticar, { headers: {} }).status, 401);
});

test("token inválido ou assinado com outro segredo → 401", () => {
  assert.equal(executar(autenticar, comToken("lixo")).status, 401);
  const falsificado = jwt.sign({ role: "admin" }, "outro-segredo", { subject: "1" });
  assert.equal(executar(autenticar, comToken(falsificado)).status, 401);
});

test("token válido identifica o usuário", () => {
  const resultado = executar(autenticar, comToken(gerarToken({ id: "42", role: "client" })));
  assert.equal(resultado.chamouNext, true);
  assert.deepEqual(resultado.request.usuario, { id: "42", role: "client" });
});

test("permitir bloqueia perfil fora da lista", () => {
  const cliente = { usuario: { id: "1", role: "client" as const } };
  assert.equal(executar(permitir("employee", "admin"), cliente).status, 403);
  assert.equal(executar(permitir("employee", "admin"), { usuario: { id: "2", role: "employee" } }).chamouNext, true);
  assert.equal(executar(permitir("admin"), { usuario: { id: "2", role: "employee" } }).status, 403);
});

test("dono: cliente filtra pelo próprio id, equipe vê tudo", () => {
  assert.equal(dono({ usuario: { id: "7", role: "client" } } as Request), "7");
  assert.equal(dono({ usuario: { id: "8", role: "employee" } } as Request), null);
  assert.equal(dono({ usuario: { id: "9", role: "admin" } } as Request), null);
});
