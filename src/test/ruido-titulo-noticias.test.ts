import { describe, it, expect } from "vitest";
import { motivoTituloLixo } from "../../supabase/functions/_shared/nl-app/edge-shared/ruido-titulo";

const desc = "Descrição com conteúdo real da notícia.";
const url = "https://wabetainfo.com/whatsapp-is-testing-a-new-contacts-tab-on-android/";

describe("filtro de títulos institucionais", () => {
  it.each([
    "WhatsApp is testing a new Contacts tab that shows who’s online",
    "💬 WhatsApp testa novo separador de Contactos",
    "Netflix sobe preço da subscrição",
    "Google muda login das contas",
  ])("deixa passar notícias reais: %s", (t) => {
    expect(motivoTituloLixo(t, desc, url)).toBeNull();
  });

  it.each([
    "Contactos", "Política de privacidade", "Termos de serviço",
    "Gerir preferências de email", "Ler mais", "Sobre nós",
  ])("descarta rótulos institucionais: %s", (t) => {
    expect(motivoTituloLixo(t, desc, "https://exemplo.pt/x")).toBe("pagina_institucional");
  });
});
