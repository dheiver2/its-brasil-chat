// Base de conhecimento ITS Brasil (RAG) — conteúdo institucional e de produtos
// da ITS Telecomunicações Ltda. Editável à mão; mantenha a interface KBChunk.
export interface KBChunk { title: string; content: string; }
export const KNOWLEDGE_BASE: KBChunk[] = [
  {
    "title": "Sobre a ITS Brasil",
    "content": "A ITS Brasil (razão social ITS Telecomunicações Ltda, CNPJ 08.772.214/0001-98) é uma provedora de internet com mais de 17 anos de atuação no mercado corporativo. O lema da empresa é 'A internet para você'. A ITS Brasil oferece internet de fibra óptica para clientes residenciais e empresariais e links dedicados para empresas, com rede própria e presença em mais de 40 municípios da Bahia, incluindo Salvador, Ilhéus, Feira de Santana e Vitória da Conquista."
  },
  {
    "title": "Internet Residencial (Fibra Óptica)",
    "content": "A internet residencial da ITS Brasil é 100% fibra óptica (FTTH — fibra até a residência), com planos que vão de 60 Mbps a 600 Mbps. Todos os planos incluem Wi-Fi. A conexão em fibra oferece mais estabilidade, menor latência e velocidade real próxima da contratada. É indicada para streaming (Netflix, YouTube, etc.), jogos online, home office, videochamadas e residências com várias pessoas e dispositivos conectados ao mesmo tempo. Instalação e suporte técnico são locais."
  },
  {
    "title": "Internet Empresarial",
    "content": "A internet empresarial da ITS Brasil é uma solução de banda larga corporativa de alta performance, com planos dimensionados de acordo com o porte e a necessidade da empresa. Inclui prioridade de atendimento e suporte dedicado. É indicada para escritórios, comércios e operações que dependem de uma conexão estável no dia a dia. Para necessidades críticas, a recomendação é o link dedicado."
  },
  {
    "title": "Link Dedicado Corporativo",
    "content": "O link dedicado da ITS Brasil é uma conexão exclusiva para a empresa, com banda simétrica (mesma velocidade de download e upload), IP fixo válido e SLA (acordo de nível de serviço) com disponibilidade garantida em contrato. Diferente da internet compartilhada, a banda do link dedicado não é dividida com outros clientes. É indicado para empresas que hospedam servidores, usam VoIP, cloud computing, câmeras remotas, ERPs online ou têm operações que não podem sofrer interrupções. Oferece maior estabilidade e garantias contratuais de desempenho."
  },
  {
    "title": "Cobertura e Presença",
    "content": "A ITS Brasil está presente em mais de 40 municípios da Bahia, com destaque para Salvador, Ilhéus, Feira de Santana e Vitória da Conquista. A empresa atua há mais de 17 anos no mercado corporativo, com rede própria de fibra óptica e equipes técnicas locais para instalação e suporte."
  },
  {
    "title": "Contato e Atendimento",
    "content": "Canais de atendimento da ITS Brasil. Salvador (matriz): telefone (71) 3402-0800; endereço Caminho das Árvores, Ed. Liz Corporate, 111, 5º andar, Salvador/BA. Ilhéus: telefone e WhatsApp (73) 3199-9000; endereço Rua Visconde de Mauá, 200, Cidade Nova, Ilhéus/BA. Site oficial: www.itsbrasil.net. Redes sociais: Instagram @itsbrasil_oficial, Facebook /itsbrasil.net, LinkedIn /company/itsbrasil, Telegram @ItsBrasiloficial_bot."
  },
  {
    "title": "Diferenciais ITS Brasil",
    "content": "Principais diferenciais da ITS Brasil: mais de 17 anos de experiência no mercado corporativo; rede 100% de fibra óptica; atendimento e suporte técnico local, próximo do cliente; portfólio que vai do plano residencial ao link dedicado empresarial, permitindo crescer junto com a necessidade do cliente; presença consolidada em mais de 40 municípios da Bahia."
  }
];
