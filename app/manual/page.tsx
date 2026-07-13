import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manual — Ítala",
  description: "Guia de uso da Ítala, a assistente de IA da ITS Brasil.",
};

const AREAS: [string, string][] = [
  ["Financeiro", "“Monte uma planilha de custos do projeto X com itens, quantidade, valor unitário e total.”"],
  ["Comercial / Vendas", "“Faça uma proposta comercial em Word de internet dedicada para a empresa Y.”"],
  ["Relacionamento", "“Escreva um e-mail cordial avisando o cliente sobre manutenção programada.”"],
  ["Técnico / Redes", "“Crie um checklist de instalação de link dedicado e explique o que é IP fixo válido.”"],
  ["Gestão de Pessoas", "“Redija um comunicado interno sobre o novo horário de atendimento.”"],
  ["Inteligência / Dados", "“Pesquise tendências de internet e fibra óptica para provedores em 2026 e cite as fontes.”"],
  ["Qualquer área", "“Resuma este PDF anexado e liste prazos e valores.”"],
];

export default function ManualPage() {
  return (
    <article className="manual">
      <header className="manual-head">
        <img src="/logo-its.png" alt="ITS Brasil" />
        <div>
          <h1>Manual da Ítala</h1>
          <p className="manual-sub">Assistente de IA da ITS Brasil — internet de fibra e conectividade.</p>
        </div>
      </header>

      <a className="manual-cta" href="/chat">Abrir a Ítala →</a>

      <section>
        <h2>1. O que é a Ítala</h2>
        <p>
          A Ítala é a assistente virtual da ITS Brasil. Ela conversa em português, entende o contexto da
          empresa e ajuda no dia a dia: tira dúvidas, escreve textos, pesquisa na internet, lê arquivos,
          entende imagens, transcreve áudios e gera planilhas e documentos prontos para baixar.
        </p>
      </section>

      <div className="manual-note">
        <strong>Como a Ítala trabalha — especificação primeiro.</strong> Antes de entregar
        algo (texto, planilha, documento, análise), a Ítala define a <em>especificação</em>:
        objetivo, para quem/uso, requisitos e formato. Por isso, em pedidos vagos ela pode fazer
        de 1 a 3 perguntas antes de responder. Quanto mais detalhes você der de início, mais
        rápido e certeiro fica o resultado.
      </div>

      <section>
        <h2>2. Como acessar</h2>
        <ol>
          <li>Abra a plataforma: <strong>https://ia.itsbrasil.net</strong></li>
          <li>Clique em <strong>Entrar</strong> e informe seu <strong>e-mail</strong> e a <strong>senha</strong> que recebeu.</li>
          <li>A senha diferencia maiúsculas de minúsculas — digite exatamente como recebeu.</li>
          <li>Para sair, clique no botão de logout ao lado do seu nome (canto inferior esquerdo).</li>
        </ol>
        <p className="muted">Acesso restrito aos funcionários cadastrados. A sessão dura ~12 horas.</p>
      </section>

      <section>
        <h2>3. Conversar</h2>
        <ul>
          <li>Digite sua pergunta no campo de mensagem e pressione <strong>Enter</strong>.</li>
          <li>As respostas saem em tempo real (listas, tabelas, código, fórmulas).</li>
          <li>Você pode <strong>Copiar</strong> a resposta ou pedir para <strong>Regenerar</strong>.</li>
          <li>Use <strong>Nova conversa</strong> para um novo assunto; o histórico fica salvo, pode ser renomeado, buscado, organizado em pastas e excluído.</li>
        </ul>
      </section>

      <section>
        <h2>4. Gerar planilha (.xlsx)</h2>
        <p>Peça uma planilha financeira, de custos, orçamento ou cotação. A Ítala monta a tabela com totais e mostra o botão <strong>“Baixar .xlsx”</strong>.</p>
        <p className="ex">Ex.: “Crie uma planilha de orçamento mensal com categorias, valor previsto e valor realizado.”</p>
      </section>

      <section>
        <h2>5. Gerar documento Word (.docx)</h2>
        <p>Peça uma proposta, relatório, carta, contrato ou comunicado. Aparece o botão <strong>“Baixar .docx”</strong>.</p>
        <p className="ex">Ex.: “Faça uma proposta comercial de internet 500MB simétrica para a empresa ACME.”</p>
      </section>

      <section>
        <h2>6. Anexar e ler arquivos</h2>
        <ul>
          <li>Clique no ícone de anexo e envie <strong>PDF, Word, Excel ou texto</strong>.</li>
          <li>Depois peça: resumir, extrair dados, analisar ou comparar.</li>
        </ul>
        <p className="ex">Ex.: “Analise esta planilha e aponte os três maiores gastos.”</p>
      </section>

      <section>
        <h2>7. Falar por voz</h2>
        <ul>
          <li>Clique no ícone de <strong>microfone</strong>, fale e clique de novo para parar. A fala é transcrita e cai no campo de mensagem — revise e envie.</li>
          <li>Também dá para enviar um <strong>arquivo de áudio</strong> (mp3, wav, m4a…) pelo ícone ao lado: ele será transcrito do mesmo jeito.</li>
          <li>Na primeira vez, o navegador pede permissão para usar o microfone — clique em <strong>Permitir</strong>.</li>
        </ul>
        <p className="muted">A transcrição é feita pelo próprio motor da ITS Brasil e funciona em qualquer navegador.</p>
      </section>

      <section>
        <h2>8. Enviar imagem</h2>
        <ul>
          <li>Clique no ícone de <strong>imagem</strong> e anexe uma foto, print ou diagrama.</li>
          <li>Opcionalmente escreva uma pergunta (“o que aparece aqui?”, “transcreva o texto desta imagem”) e envie.</li>
          <li>A Ítala analisa a imagem e responde com base no que vê.</li>
        </ul>
        <p className="muted">A primeira imagem pode demorar um pouco mais enquanto o modelo de visão é carregado.</p>
        <p className="ex">Ex.: “Resuma o que está escrito neste print de contrato.”</p>
      </section>

      <section>
        <h2>9. Pesquisar na internet</h2>
        <ul>
          <li>Clique no ícone de <strong>busca (lupa)</strong> para ativar a pesquisa na web.</li>
          <li>A resposta usará resultados da internet e mostrará as <strong>Fontes</strong> (com links).</li>
        </ul>
        <p className="muted">Use para informações atuais. Pode levar alguns segundos a mais.</p>
      </section>

      <section>
        <h2>10. Exemplos por área</h2>
        <div className="manual-table">
          <table>
            <thead><tr><th>Área</th><th>Exemplo de pedido</th></tr></thead>
            <tbody>
              {AREAS.map(([a, ex]) => (
                <tr key={a}><td>{a}</td><td>{ex}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>11. Dicas para respostas melhores</h2>
        <ul>
          <li>Seja específico: diga o objetivo, o público e o formato (planilha, Word, lista…).</li>
          <li>Dê contexto: nomes, valores, prazos. Quanto mais detalhe, melhor.</li>
          <li>Se a Ítala perguntar antes de responder, é o método “especificação primeiro” — responda as perguntas e ela entrega certinho.</li>
          <li>Peça ajustes: “deixe mais formal”, “adicione uma coluna de desconto”, “resuma em 5 itens”.</li>
        </ul>
      </section>

      <section>
        <h2>12. Limitações e boas práticas</h2>
        <ul>
          <li><strong>As respostas podem precisar de revisão</strong>: a Ítala pode errar ou simplificar detalhes. Sempre valide dados financeiros, contratos, prazos e informações estratégicas antes de usar.</li>
          <li><strong>Ela não acessa sistemas internos automaticamente</strong>: não consulta ERP, CRM, e-mail, agenda ou bases privadas por conta própria.</li>
          <li><strong>Ela não executa ações fora do chat</strong>: não envia mensagens, não agenda compromissos nem realiza tarefas externas em seu nome.</li>
          <li><strong>O uso de arquivos tem limites práticos</strong>: PDFs muito longos, planilhas grandes e documentos extensos podem ser parcialmente lidos ou resumidos.</li>
          <li><strong>A busca na web ajuda, mas não substitui a verificação</strong>: dados de mercado, preços e referências devem ser confirmados na fonte oficial.</li>
          <li><strong>Conversas longas podem perder contexto</strong>: para melhores resultados, divida pedidos grandes em etapas e recomece uma conversa quando necessário.</li>
          <li><strong>Evite enviar dados sensíveis sem necessidade</strong>: use a Ítala para apoio e organização, mas mantenha critérios humanos para decisões críticas.</li>
        </ul>
        <p><strong>Se algo não estiver claro, peça para a Ítala refazer, resumir ou estruturar a resposta em formato mais útil para o seu caso.</strong></p>
      </section>

      <footer className="manual-foot">
        <a className="manual-cta" href="/chat">Abrir a Ítala →</a>
        <a className="manual-back" href="/">← Início</a>
      </footer>
    </article>
  );
}
