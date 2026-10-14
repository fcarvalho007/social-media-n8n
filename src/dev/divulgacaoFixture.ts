// Public editorial copy from edition 319; synthetic ids/hash. Never a Cloud send record.
import { paragrafoDestaque, type FonteCronica } from "../../supabase/functions/_shared/conteudos/carrossel";
export const fonteDivulgacao: FonteCronica = {
  edicaoId: "local-newsletter-319", numero: 319, hash: "0".repeat(64), origem: "snapshot", teste: true,
  titulo: "A IA já trabalha sozinha. E nem sempre pede autorização",
  url: "https://fredericocarvalho.pt/a-ia-ja-trabalha-sozinha-e-nem-sempre-pede-autorizacao/",
  edicaoUrl: "https://hub-conteudo.lovable.app/edicoes/319",
  cursoUrl: "https://fredericocarvalho.pt/curso-de-inteligencia-artificial/",
  paragrafos: ["Um agente já não responde a perguntas: abre aplicações, envia emails e toma decisões. A questão deixou de ser o que conseguimos automatizar e passou a ser o que devemos autorizar."],
  destaques: [
    { titulo: "Estudo aponta Península Ibérica como primeira capital digital distribuída do mundo", sintese: "Investigação da Dstream Group para a DE-CIX identifica 35 cabos submarinos e mais de 100 centros de dados a ligar Madrid, Barcelona e Lisboa com latências de 7 a 8 milissegundos.", leitura: "Vende-se infraestrutura com a etiqueta da soberania europeia, mas quem constrói os modelos continua do outro lado do Atlântico. Exemplo desta semana: “Portugal é porta ideal para tecnologia dos EUA chegar à Europa”, diz Rubio, chefe da diplomacia americana, em conferência de imprensa em Lisboa.", fonteUrl: "https://tek.sapo.pt/", publisher: "tek.sapo.pt" },
    { titulo: "Wikipedia, podcasts e Reddit dominam as citações dos sistemas de IA", sintese: "Estudo da Muck Rack sobre mais de 25 milhões de links citados coloca a Wikipedia como o domínio mais referido pelo ChatGPT; 42% das citações explicam processos.", leitura: "42% das citações da Wikipedia são sobre processos, não marcas, e o Reddit chega a 59% dos decisores B2B. Quem continuar a tratar o PR como anexo perde a corrida.", fonteUrl: "https://searchenginejournal.com/", publisher: "searchenginejournal.com" },
    { titulo: 'TikTok revela primeiro bestseller europeu do BookTok com "Fourth Wing"', sintese: "Em 2025 foram vendidos mais de 50 milhões de livros BookTok na Europa; 53% dos utilizadores descobriram novos géneros e quase 75% alargaram os seus hábitos de leitura.", leitura: "O TikTok não está a vender livros: está a vender o algoritmo como intermediário entre o leitor e a editora. Quando 75% dos utilizadores dizem que alargaram hábitos de leitura, o que muda não é a literatura, é quem controla a descoberta.", fonteUrl: "https://socialmediatoday.com/", publisher: "socialmediatoday.com" },
  ],
};
fonteDivulgacao.paragrafos.push(...fonteDivulgacao.destaques!.map(paragrafoDestaque));
