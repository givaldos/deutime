"use client";

import { useId, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, CircleDot, MapPin, Trophy } from "lucide-react";
import Image from "next/image";
import styles from "@/app/home.module.css";

const views = ["Presenças", "Equipes", "Súmula"] as const;

export function HomeDemo() {
  const [view, setView] = useState<(typeof views)[number]>("Presenças");
  const panelId = useId();
  return (
    <div id="demonstracao" className={styles.demo} role="region" aria-label="Demonstração do DeuTime com dados fictícios">
      <div className={styles.demoTop}><span><Image src="/brand/icone-app-deutime.svg" width={29} height={29} alt="" /> Visão do organizador</span><span className={styles.example}>Exemplo</span></div>
      <div className={styles.demoTitle}><div><p>SEU RACHA, ORGANIZADO</p><h2>Racha de quinta</h2></div><CircleDot className={styles.demoBall} size={40} strokeWidth={1} aria-hidden="true" /></div>
      <div className={styles.demoMeta}><span><CalendarDays size={14} aria-hidden="true" /> Quinta, 20h</span><span><MapPin size={14} aria-hidden="true" /> Quadra do bairro</span></div>
      <div className={styles.demoViews} role="group" aria-label="Escolher uma visão do exemplo">
        {views.map((item) => <button type="button" key={item} aria-pressed={view === item} aria-controls={panelId} onClick={() => setView(item)}>{item}</button>)}
      </div>
      <div id={panelId} className={styles.demoPanel} aria-live="polite" aria-atomic="true">
        {view === "Presenças" && <>
          <div className={styles.presenceHeader}><span>Lista de presença</span><span className={styles.status}><Check size={13} aria-hidden="true" /> Deu time!</span></div>
          <div className={styles.presenceNumber}><strong>12<span>/ 12</span></strong><span>atletas confirmados<br />para o jogo</span></div>
          <div className={styles.presenceBar} aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} />)}</div>
          <div className={styles.playerList}>{[["RA", "Rafa", "Confirmado"], ["BR", "Bruno", "Confirmado"], ["CA", "Caio", "Talvez"]].map(([initial, name, status]) => <div key={name}><span className={styles.avatar}>{initial}</span><strong>{name}</strong><span className={status === "Talvez" ? styles.maybe : styles.confirmed}>{status}</span></div>)}</div>
          <p className={styles.demoHint}>Uma lista para acompanhar as respostas da galera.</p>
        </>}
        {view === "Equipes" && <>
          <div className={styles.presenceHeader}><span>Divisão dos times</span><span className={styles.status}>Para revisar</span></div>
          <div className={styles.pitch} aria-label="Exemplo de duas equipes com seis atletas cada"><div className={styles.pitchLine} /><div className={styles.pitchCircle} />{[["Rafa", "Léo", "Bruno", "Davi", "Gui", "Ivo"], ["Beto", "Nico", "Vini", "Tom", "Alex", "Zé"]].map((team, i) => <div key={i} className={styles.pitchTeam}>{team.map((name) => <span key={name}><i>{name[0]}</i>{name}</span>)}</div>)}</div>
          <div className={styles.teamLegend}><span><i /> Time verde</span><span><i /> Time branco</span></div>
          <p className={styles.demoHint}>Você revisa a divisão antes de publicar.</p>
        </>}
        {view === "Súmula" && <>
          <div className={styles.presenceHeader}><span>Resumo da partida</span><span className={styles.status}>Encerrada</span></div>
          <div className={styles.score}><span>Time verde</span><strong>3 <em>×</em> 2</strong><span>Time branco</span></div>
          <div className={styles.matchFacts}><div><span>Gols do time verde</span><strong>Rafa (2), Bruno (1)</strong></div><div><span>Gols do time branco</span><strong>Vini (1), Alex (1)</strong></div></div>
          <div className={styles.mvp}><Trophy size={25} aria-hidden="true" /><div><span>Craque da Galera</span><strong>Rafa</strong></div></div>
          <p className={styles.demoHint}>O jogo termina. A história fica no time.</p>
        </>}
      </div>
      <div className={styles.demoBottom}><span>Explore as visões acima</span><ArrowUpRight size={17} aria-hidden="true" /></div>
      <p className={styles.demoCaption}>Demonstração ilustrativa com dados fictícios.</p>
    </div>
  );
}
