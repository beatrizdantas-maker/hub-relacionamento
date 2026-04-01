"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ── HELPERS ────────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const hoje = () => new Date().toISOString().split("T")[0];
const bimestreAtual = () => Math.ceil((new Date().getMonth() + 1) / 3);
export default function PlayApp({ escola, profile, alunos, equipe, onVoltar }) {
  return <div style={{padding:20}}><h1>�o� NARA Play - Em breve!</h1><button onClick={onVoltar}>』゛「 Voltar</button></div>;}
