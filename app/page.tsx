import { ArrowDown, ArrowRight, CalendarDays, Check, ClipboardList, MessageCircle, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { HomeDemo } from "@/components/home-demo";
import { getSessionDestination } from "@/lib/auth/dal";
import styles from "./home.module.css";

const capabilities = [
  { icon: CalendarDays, number: "01", title: "Uma agenda que todo mundo entende.", text: "Jogos avulsos ou recorrentes, horário e local definidos. Remarque quando precisar e mantenha o histórico do racha.", detail: "Agenda e recorrência" },
  { icon: MessageCircle, number: "02", title: "A chamada começa no WhatsApp.", text: "Compartilhe o link do jogo e acompanhe quem vai, quem não vai e quem ainda está em dúvida. Configure lembretes para quem não respondeu.", detail: "Chamada, confirmação e lembretes" },
  { icon: Users, number: "03", title: "O elenco tem lugar. A divisão também.", text: "Reúna os atletas, reutilize equipes e peça uma sugestão de divisão. Você revisa os times antes de publicar para a galera.", detail: "Elenco e divisão de times" },
  { icon: ClipboardList, number: "04", title: "O que aconteceu fica registrado.", text: "Registre presença, placar, gols, assistências e cartões. A súmula reúne a partida para consultar depois do apito final.", detail: "Partida e súmula" },
  { icon: Trophy, number: "05", title: "A resenha ganha história.", text: "Abra a votação do Craque da Galera, acompanhe estatísticas e converse sobre a partida. Cada jogo passa a fazer parte da história do time.", detail: "Votação, conversa e estatísticas" },
  { icon: ShieldCheck, number: "06", title: "Do racha ao campeonato.", text: "Organize confrontos, acompanhe a classificação e compartilhe a tabela publicada. Cada time mantém seu próprio elenco, agenda e histórico.", detail: "Campeonatos e múltiplos times" },
];

const questions = [
  { question: "Como começo a organizar meu racha?", answer: "Nesta fase, criar um novo time exige um código de convite. Crie sua conta de organizador, entre no DeuTime e use seu código na criação do time. Depois, cadastre o jogo e compartilhe o convite com os atletas." },
  { question: "A galera precisa baixar um aplicativo?", answer: "Não. O DeuTime funciona no navegador do celular. O organizador compartilha o link pelo WhatsApp, e cada atleta segue as orientações de acesso para participar." },
  { question: "O que o DeuTime faz e o que depende de mim?", answer: "O app reúne a agenda, as respostas e os registros do jogo. Os lembretes dependem da configuração do time. Você define os jogos, acompanha pendências, revisa a divisão e registra o que aconteceu na partida." },
  { question: "Sou atleta. Preciso criar uma conta de organizador?", answer: "Use o link do time ou do jogo enviado por quem organiza. Ele leva ao caminho de participação dos atletas. O cadastro de organizador é para quem vai administrar o racha." },
  { question: "Os dados dos atletas ficam públicos?", answer: "Os contatos não aparecem nas páginas públicas. O compartilhamento de informações esportivas depende das configurações de publicação e do consentimento aplicável. Cada atleta pode gerenciar sua privacidade no perfil." },
  { question: "O app recebe o dinheiro do racha?", answer: "Não. Cobrança de atletas, divisão de pagamentos e repasses não fazem parte da versão atual do DeuTime." },
];

export default async function Home() {
  const destination = await getSessionDestination();
  if (destination) redirect(destination);

  return (
    <div className={styles.page}>
      <a href="#conteudo" className={styles.skip}>Pular para o conteúdo</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BrandMark />
          <nav aria-label="Navegação principal" className={styles.nav}>
            <a href="#recursos">O que resolve</a><a href="#como-funciona">Como começar</a><a href="#duvidas">Dúvidas</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/auth/login" className={styles.login}>Entrar</Link>
            <Link href="/auth/sign-up" className={styles.headerCta}>Começar <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1}>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.liveDot} /> O app de quem faz o racha acontecer</p>
            <h1 id="home-title">Quem organiza<br />também<br /> merece <span className={styles.highlight}>jogar.</span></h1>
            <p className={styles.heroDescription}>Tire a lista de presença da cabeça. Reúna agenda, confirmações, times e resultados no DeuTime. Compartilhe o jogo no WhatsApp e acompanhe as respostas.</p>
            <div className={styles.heroActions}>
              <Link href="/auth/sign-up" className={styles.primary}>Organizar meu racha <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#demonstracao" className={styles.textLink}>Explorar o app <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
            <p className={styles.accessNote}>Acesso por convite para criar novos times.</p>
          </div>
          <HomeDemo />
          <div className={styles.heroFoot}>
            <p>Da primeira chamada<br /><strong>à resenha depois do jogo.</strong></p>
            <ul><li><Check size={16} aria-hidden="true" /> Pelo celular</li><li><Check size={16} aria-hidden="true" /> Sem instalar aplicativo</li><li><Check size={16} aria-hidden="true" /> Cada time no seu espaço</li></ul>
          </div>
        </section>
        <section id="recursos" className={`${styles.container} ${styles.resources}`} aria-labelledby="resources-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Menos coisa para carregar sozinho</p><h2 id="resources-title">O racha inteiro.<br />Cada coisa no seu lugar.</h2></div>
            <p>Da pergunta “quem vai?” ao resultado da partida, você acompanha o que está resolvido e o que ainda precisa da sua atenção.</p>
          </div>
          <div className={styles.capabilities}>
            {capabilities.map(({ icon: Icon, number, title, text, detail }) => (
              <article key={number} className={styles.capability}>
                <div className={styles.capabilityTop}><Icon size={25} strokeWidth={1.5} aria-hidden="true" /><span>{number}</span></div>
                <p className={styles.detail}>{detail}</p><h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.responsibility} aria-labelledby="responsibility-title">
          <div className={`${styles.container} ${styles.responsibilityInner}`}>
            <div><p className={styles.eyebrow}>A organização sai da sua memória</p><h2 id="responsibility-title">Você decide.<br />O DeuTime ajuda<br />a acompanhar.</h2><p className={styles.responsibilityCopy}>Organizar envolve decisões. Ter as respostas, a agenda e o histórico reunidos deixa mais claro qual é o próximo passo.</p></div>
            <div className={styles.handoff}>
              <div className={styles.handoffHeader}><span>Você cuida de</span><span>O DeuTime reúne</span></div>
              {[["Marcar o encontro", "Datas, locais e recorrência"], ["Chamar a galera", "Confirmações e pendências"], ["Revisar as equipes", "Divisão para compartilhar"], ["Registrar a partida", "Súmula, resultados e histórico"]].map(([action, result]) => <div className={styles.handoffRow} key={action}><span>{action}</span><ArrowRight size={17} aria-hidden="true" /><strong>{result}</strong></div>)}
              <p><MessageCircle size={19} aria-hidden="true" /> O grupo continua sendo o ponto de encontro. O link leva a galera até o jogo.</p>
            </div>
          </div>
        </section>
        <section id="como-funciona" className={`${styles.container} ${styles.how}`} aria-labelledby="how-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Do convite ao primeiro jogo</p><h2 id="how-title">Comece pelo próximo racha.</h2></div><p>Você organiza pelo navegador. A galera participa pelo link que chega no grupo.</p></div>
          <ol className={styles.steps}>
            {[
              ["Crie o espaço do time", "Crie sua conta de organizador. Depois, use seu código de convite para cadastrar o time."],
              ["Marque e compartilhe", "Defina data, horário e local. Convide os atletas e envie o link do jogo no WhatsApp."],
              ["Acompanhe até o pós-jogo", "Confira as respostas, revise as equipes e registre a partida para construir o histórico."],
            ].map(([title, description], i) => <li key={title}><span className={styles.stepNumber}>0{i + 1}</span><h3>{title}</h3><p>{description}</p></li>)}
          </ol>
          <div className={styles.athleteNote}><Users size={23} aria-hidden="true" /><p><strong>Veio para jogar?</strong> Peça o link do time ou do jogo a quem organiza o seu racha.</p></div>
        </section>
        <section id="duvidas" className={`${styles.container} ${styles.faq}`} aria-labelledby="faq-title">
          <div><p className={styles.eyebrow}>Antes de entrar em campo</p><h2 id="faq-title">Dúvidas de<br />quem organiza.</h2></div>
          <div className={styles.questions}>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true" className={styles.plus}>+</span></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className={`${styles.container} ${styles.finalCta}`} aria-labelledby="start-title">
          <div className={styles.finalField} aria-hidden="true"><span /></div>
          <div className={styles.finalContent}><p className={styles.eyebrow}>Seu próximo jogo começa aqui</p><h2 id="start-title">Leve o racha para o DeuTime.<br />E você para o jogo.</h2><p>Já tem um código de convite? Crie sua conta e organize o primeiro encontro do time.</p><Link href="/auth/sign-up" className={styles.primary}>Começar com meu convite <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}><div><BrandMark /><p>Organização para quem faz o jogo acontecer.</p></div><nav aria-label="Navegação do rodapé"><a href="#recursos">Recursos</a><a href="#duvidas">Dúvidas</a><Link href="/auth/login">Entrar</Link><Link href="/auth/sign-up">Criar conta</Link></nav><span>deutime.app</span></footer>
    </div>
  );
}
