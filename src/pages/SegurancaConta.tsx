import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alterarMinhaPassword } from "@/services/conta";

// Self-service password change for the signed-in user only. No prefill, no logging of values.
export default function SegurancaConta() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [estado, setEstado] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado(null);
    if (nova.length < 12) return setEstado({ tipo: "erro", msg: "A nova password deve ter pelo menos 12 caracteres." });
    if (nova !== conf) return setEstado({ tipo: "erro", msg: "As passwords não coincidem." });
    if (nova === atual) return setEstado({ tipo: "erro", msg: "A nova password tem de ser diferente da atual." });
    setOcupado(true);
    const r = await alterarMinhaPassword(atual, nova);
    setOcupado(false);
    setAtual(""); setNova(""); setConf("");
    setEstado("mensagem" in r ? { tipo: "erro", msg: r.mensagem } : { tipo: "ok", msg: "Password alterada. A sessão atual mantém-se." });
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Segurança da conta</h1>
      <p className="text-sm text-muted-foreground">Muda a password da tua própria conta. A entrada habitual continua a ser por código enviado por email.</p>
      <form onSubmit={submeter} className="space-y-3" autoComplete="off">
        <div className="space-y-1"><Label htmlFor="atual">Password atual</Label>
          <Input id="atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="nova">Nova password</Label>
          <Input id="nova" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="conf">Confirmar nova password</Label>
          <Input id="conf" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} required /></div>
        {estado && <p className={estado.tipo === "ok" ? "text-sm text-primary" : "text-sm text-destructive"}>{estado.msg}</p>}
        <Button type="submit" disabled={ocupado}>{ocupado ? "A alterar…" : "Alterar password"}</Button>
      </form>
    </div>
  );
}
