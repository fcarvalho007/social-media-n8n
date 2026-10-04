import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { chaveRecuperacao } from "@/lib/recuperacaoLocal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIXTURES } from "@/features/editor-grafico/fixtures";
import { EditorGrafico } from "@/features/editor-grafico/EditorGrafico";

export { LIMIAR_EQUIVALENCIA, LIMIAR_PERDA_CONTEUDO, LIMIAR_ZONA } from "@/features/editor-grafico/EditorGrafico";

/** Isolated R1 proof: synthetic fixtures only, with browser/server comparison. */
export default function EditorProva() {
  const { user } = useAuth();
  const [id, setId] = useState(FIXTURES[0].id);
  const pacote = FIXTURES.find((f) => f.id === id) ?? FIXTURES[0];
  const seletor = (
    <Select value={id} onValueChange={setId}>
      <SelectTrigger className="h-11 lg:h-9 w-full lg:w-72" aria-label="Documento de teste"><SelectValue /></SelectTrigger>
      <SelectContent>{FIXTURES.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
    </Select>
  );
  return (
    <EditorGrafico key={id} pacoteInicial={pacote} seletor={seletor}
      titulo={<>Editor de carrosséis <span className="font-normal text-muted-foreground">· prova</span></>}
      chaveLocal={user ? chaveRecuperacao(user.id, "editor-prova", pacote.id, null) : null}
    />
  );
}
