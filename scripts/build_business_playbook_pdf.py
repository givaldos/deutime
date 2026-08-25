from __future__ import annotations

import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "deutime_playbook_negocios_v3.pdf"
LOGO_LIGHT = ROOT / "public" / "brand" / "logo-deutime-email-640.png"
LOGO_DARK = ROOT / "public" / "brand" / "logo-deutime-email-640-fundo-escuro.png"

W, H = A4
M = 20 * mm

INK = colors.HexColor("#082E26")
INK_2 = colors.HexColor("#0D4538")
LIME = colors.HexColor("#B7F52A")
LIME_2 = colors.HexColor("#D8FF70")
PAPER = colors.HexColor("#F7F8F2")
WHITE = colors.white
MUTED = colors.HexColor("#66736E")
LINE = colors.HexColor("#D9DED8")
SOFT = colors.HexColor("#EAF4EE")
WARM = colors.HexColor("#FFF2DB")
RED = colors.HexColor("#B42318")
BLUE = colors.HexColor("#1D4ED8")


def register_fonts() -> None:
    font_dir = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Black", str(font_dir / "Arial Black.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Italic", str(font_dir / "Arial Italic.ttf")))


register_fonts()

STYLES = {
    "body": ParagraphStyle(
        "body", fontName="Arial", fontSize=10.2, leading=14.2, textColor=INK
    ),
    "body_small": ParagraphStyle(
        "body_small", fontName="Arial", fontSize=8.2, leading=11.2, textColor=MUTED
    ),
    "body_white": ParagraphStyle(
        "body_white", fontName="Arial", fontSize=10.2, leading=14.2, textColor=WHITE
    ),
    "card_title": ParagraphStyle(
        "card_title", fontName="Arial-Bold", fontSize=11, leading=13.5, textColor=INK
    ),
    "card_title_white": ParagraphStyle(
        "card_title_white", fontName="Arial-Bold", fontSize=11, leading=13.5, textColor=WHITE
    ),
    "section_white": ParagraphStyle(
        "section_white", fontName="Arial-Black", fontSize=16, leading=18, textColor=WHITE
    ),
    "big": ParagraphStyle(
        "big", fontName="Arial-Black", fontSize=23, leading=25.5, textColor=INK
    ),
    "big_white": ParagraphStyle(
        "big_white", fontName="Arial-Black", fontSize=23, leading=25.5, textColor=WHITE
    ),
    "metric": ParagraphStyle(
        "metric", fontName="Arial-Black", fontSize=21, leading=22, textColor=INK
    ),
    "metric_white": ParagraphStyle(
        "metric_white", fontName="Arial-Black", fontSize=21, leading=22, textColor=WHITE
    ),
    "center": ParagraphStyle(
        "center", fontName="Arial-Bold", fontSize=10, leading=13, alignment=TA_CENTER, textColor=INK
    ),
}


def P(c: canvas.Canvas, text: str, x: float, y: float, width: float, style: str = "body") -> float:
    p = Paragraph(text, STYLES[style])
    _, height = p.wrap(width, H)
    p.drawOn(c, x, y - height)
    return y - height


def box(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill, stroke=LINE, radius=8) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def page_header(c: canvas.Canvas, section: str, index: int, dark: bool = False) -> None:
    logo = LOGO_DARK if dark else LOGO_LIGHT
    c.drawImage(str(logo), M, H - 31 * mm, width=42 * mm, height=10.1 * mm, mask="auto")
    c.setFont("Arial-Bold", 7.4)
    c.setFillColor(WHITE if dark else MUTED)
    c.drawRightString(W - M, H - 23 * mm, f"{index:02d} - {section.upper()}")


def page_footer(c: canvas.Canvas, index: int, dark: bool = False, note: str = "DeuTime - playbook de negocios") -> None:
    c.setFont("Arial", 6.8)
    c.setFillColor(colors.HexColor("#B6C1BC") if dark else MUTED)
    c.drawString(M, 12 * mm, note)
    c.drawRightString(W - M, 12 * mm, str(index))


def page_title(c: canvas.Canvas, eyebrow: str, title: str, subtitle: str | None = None, dark: bool = False) -> float:
    y = H - 48 * mm
    c.setFont("Arial-Bold", 8)
    c.setFillColor(LIME if dark else INK_2)
    c.drawString(M, y, eyebrow.upper())
    y -= 9 * mm
    y = P(c, title, M, y, W - 2 * M, "big_white" if dark else "big")
    if subtitle:
        y -= 5 * mm
        y = P(c, subtitle, M, y, W - 2 * M, "body_white" if dark else "body")
    return y


def bullet_list(c: canvas.Canvas, items: list[str], x: float, y: float, width: float, dark: bool = False, gap=3.2 * mm) -> float:
    for item in items:
        c.setFillColor(LIME if dark else INK_2)
        c.circle(x + 2.2 * mm, y - 2.8 * mm, 1.35 * mm, fill=1, stroke=0)
        y = P(c, item, x + 7 * mm, y, width - 7 * mm, "body_white" if dark else "body")
        y -= gap
    return y


def draw_table(c: canvas.Canvas, data: list[list[str]], x: float, y: float, widths: list[float], row_heights=None,
               header_bg=INK, header_fg=WHITE, body_bg=WHITE, font_size=8.2) -> float:
    cooked = []
    for r, row in enumerate(data):
        style = ParagraphStyle(
            f"t{r}", fontName="Arial-Bold" if r == 0 else "Arial",
            fontSize=font_size, leading=font_size + 2.4,
            textColor=header_fg if r == 0 else INK,
        )
        cooked.append([Paragraph(str(cell), style) for cell in row])
    t = Table(cooked, colWidths=widths, rowHeights=row_heights, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("BACKGROUND", (0, 1), (-1, -1), body_bg),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [body_bg, colors.HexColor("#F2F5F1")]),
    ]))
    _, th = t.wrap(sum(widths), H)
    t.drawOn(c, x, y - th)
    return y - th


def new_page(c: canvas.Canvas, index: int, section: str, dark=False) -> None:
    c.setFillColor(INK if dark else PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    page_header(c, section, index, dark)
    page_footer(c, index, dark)


def cover(c: canvas.Canvas) -> None:
    c.setFillColor(INK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.drawImage(str(LOGO_DARK), M, H - 40 * mm, width=48 * mm, height=11.6 * mm, mask="auto")
    c.setFillColor(LIME)
    c.roundRect(M, H - 83 * mm, 36 * mm, 8 * mm, 4 * mm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Arial-Bold", 8)
    c.drawCentredString(M + 18 * mm, H - 77.6 * mm, "PLAYBOOK V3")
    y = H - 110 * mm
    y = P(c, "Playbook de<br/>Negocios", M, y, W - 2 * M, "big_white")
    y -= 8 * mm
    y = P(c, "SaaS, cobranca pelo WhatsApp e pagamentos embarcados para times, rachas e escolas de futebol.", M, y, 125 * mm, "body_white")
    c.setFillColor(LIME)
    c.rect(M, 75 * mm, 4 * mm, 51 * mm, fill=1, stroke=0)
    P(c, "Tese central", M + 10 * mm, 121 * mm, 55 * mm, "card_title")
    P(c, "O DeuTime organiza o jogo, automatiza a cobranca e entrega o valor ao recebedor certo - sem custodiar dinheiro de terceiros.", M + 10 * mm, 111 * mm, 112 * mm, "body_white")
    c.setFont("Arial", 8)
    c.setFillColor(colors.HexColor("#B6C1BC"))
    c.drawString(M, 25 * mm, "Atualizado em 24 ago 2026")
    c.drawRightString(W - M, 25 * mm, "deutime.app")
    c.showPage()


def build() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
    c.setTitle("DeuTime - Playbook de Negocios v3")
    c.setAuthor("DeuTime")
    c.setSubject("Modelo de negocios, pricing, pagamentos embarcados e plano de validacao")
    cover(c)

    # 2 - Decisao executiva
    new_page(c, 2, "Decisao executiva")
    y = page_title(c, "Resumo", "Uma empresa de software com uma segunda avenida de receita.",
                   "O DeuTime deve monetizar primeiro a automacao da rotina e, depois, a movimentacao financeira que ja existe dentro dos grupos.")
    y -= 8 * mm
    cards = [
        ("R$ 79,90", "Preco publico inicial", "Por time e por mes para uma rotina semanal automatizada."),
        ("2%", "Take rate de referencia", "Comissao inicial sobre valores efetivamente recebidos."),
        ("70%+", "Margem de contribuicao", "Meta no uso adaptativo, antes de pro-labore e aquisicao."),
    ]
    cw = (W - 2 * M - 10 * mm) / 3
    for i, (metric, label, desc) in enumerate(cards):
        x = M + i * (cw + 5 * mm)
        box(c, x, y - 39 * mm, cw, 39 * mm, LIME if i == 0 else WHITE)
        P(c, metric, x + 5 * mm, y - 5 * mm, cw - 10 * mm, "metric")
        P(c, label, x + 5 * mm, y - 17 * mm, cw - 10 * mm, "card_title")
        P(c, desc, x + 5 * mm, y - 25 * mm, cw - 10 * mm, "body_small")
    y -= 50 * mm
    box(c, M, y - 45 * mm, W - 2 * M, 45 * mm, INK, stroke=INK)
    P(c, "Decisao de plataforma", M + 7 * mm, y - 7 * mm, 60 * mm, "metric_white")
    P(c, "Asaas e o candidato principal para Brasil, Pix Automatico, subcontas e split. Stripe Connect permanece como alternativa para cartao, recuperacao de receita e expansao internacional.", M + 72 * mm, y - 7 * mm, W - 2 * M - 79 * mm, "body_white")
    y -= 56 * mm
    bullet_list(c, [
        "Nao publicar ainda uma grade de cinco planos; validar primeiro uma oferta paga clara.",
        "Nao receber dinheiro de atletas na conta comum do DeuTime para repassar manualmente.",
        "Manter assinatura SaaS e comissao financeira como receitas separadas.",
        "Construir qualquer integracao financeira atras de um adapter provider-neutral.",
    ], M, y, W - 2 * M)
    c.showPage()

    # 3 - Sistema de valor
    new_page(c, 3, "Produto e mercado")
    y = page_title(c, "O produto real", "O DeuTime ja fecha o ciclo completo do futebol amador.",
                   "A cobranca financeira nao nasce isolada. Ela entra em uma jornada que ja conhece atleta, evento, presenca e administracao do time.")
    y -= 8 * mm
    stages = ["Elenco", "Evento", "Chamada", "Presenca", "Escalacao", "Partida", "Historia"]
    x0 = M
    usable = W - 2 * M
    sw = (usable - 6 * 4 * mm) / 7
    for i, s in enumerate(stages):
        x = x0 + i * (sw + 4 * mm)
        c.setFillColor(LIME if i in (2, 3) else WHITE)
        c.setStrokeColor(LINE)
        c.roundRect(x, y - 22 * mm, sw, 22 * mm, 5 * mm, fill=1, stroke=1)
        c.setFillColor(INK)
        c.setFont("Arial-Bold", 7.5)
        c.drawCentredString(x + sw / 2, y - 13 * mm, s)
        if i < 6:
            c.setStrokeColor(INK_2)
            c.line(x + sw, y - 11 * mm, x + sw + 4 * mm, y - 11 * mm)
    y -= 35 * mm
    data = [
        ["Segmento", "Dor principal", "Entrada DeuTime", "Expansao financeira"],
        ["Racha recorrente", "Confirmar, cobrar e fechar lista", "WhatsApp + evento semanal", "Mensalidade ou valor por jogo"],
        ["Time organizado", "Agenda, elenco e historico", "Operacao mobile completa", "Caixa e rateio do time"],
        ["Escola de futebol", "Mensalidade, inadimplencia e turmas", "Atletas + responsaveis + agenda", "Cobranca recorrente e repasse"],
        ["Arena / liga", "Muitos grupos e operacoes", "Multi-time e campeonatos", "Split entre operadores"],
    ]
    y = draw_table(c, data, M, y, [32 * mm, 43 * mm, 48 * mm, 42 * mm], font_size=7.6)
    y -= 9 * mm
    box(c, M, y - 38 * mm, W - 2 * M, 38 * mm, SOFT)
    P(c, "Wedge de mercado", M + 7 * mm, y - 7 * mm, 48 * mm, "card_title")
    P(c, "O atleta nao precisa instalar um novo app para ser lembrado, responder ou pagar. O WhatsApp e a porta; o DeuTime e o sistema de registro e automacao.", M + 58 * mm, y - 7 * mm, W - 2 * M - 65 * mm, "body")
    c.showPage()

    # 4 - Motor de negocio
    new_page(c, 4, "Modelo de receita")
    y = page_title(c, "Tres camadas", "Monetizar software, pagamentos e servicos - nessa ordem.")
    y -= 8 * mm
    layers = [
        ("1", "SaaS", "R$ 79,90/time/mes", "Receita recorrente previsivel pela automacao e pelo sistema operacional do time.", LIME),
        ("2", "Pagamentos", "1,5% a 2,5% do recebido", "Comissao sobre cobranca liquidada, sem transformar GMV em receita contabil.", SOFT),
        ("3", "Servicos", "Futuro", "Arbitragem, quadra, uniformes e marketplace somente apos densidade e confianca.", WHITE),
    ]
    for i, (num, name, price, desc, fill) in enumerate(layers):
        yy = y - i * 47 * mm
        box(c, M, yy - 39 * mm, W - 2 * M, 39 * mm, fill)
        c.setFillColor(INK)
        c.setFont("Arial-Black", 25)
        c.drawString(M + 7 * mm, yy - 17 * mm, num)
        P(c, name, M + 25 * mm, yy - 7 * mm, 48 * mm, "metric")
        P(c, price, M + 76 * mm, yy - 8 * mm, 43 * mm, "card_title")
        P(c, desc, M + 122 * mm, yy - 7 * mm, W - M - (M + 129 * mm), "body_small")
    y -= 148 * mm
    box(c, M, y - 31 * mm, W - 2 * M, 31 * mm, WARM)
    P(c, "Regra de foco", M + 7 * mm, y - 7 * mm, 42 * mm, "card_title")
    P(c, "A camada 2 so entra quando a camada 1 provar disposicao de pagamento. A camada 3 so entra quando houver demanda transacional repetida.", M + 54 * mm, y - 7 * mm, W - 2 * M - 61 * mm, "body")
    c.showPage()

    # 5 - Oferta
    new_page(c, 5, "Oferta e pricing")
    y = page_title(c, "Oferta inicial", "Um plano pago forte. Um caminho manual para experimentar.",
                   "O principal diferencial pago e a automacao direta pelo WhatsApp, nao uma lista artificial de recursos bloqueados.")
    y -= 8 * mm
    offers = [
        ("Manual", "R$ 0", ["1 time", "ate 30 atletas", "compartilhamento manual", "sem disparos automaticos"]),
        ("Racha", "R$ 79,90", ["1 time", "ate 30 elegiveis", "rotina semanal", "chamada + 2 lembretes"]),
        ("Piloto fundador", "R$ 59,90", ["primeiros 20 times", "maximo 90 dias", "medicao obrigatoria", "migracao ao preco publico"]),
    ]
    ow = (W - 2 * M - 10 * mm) / 3
    for i, (name, price, items) in enumerate(offers):
        x = M + i * (ow + 5 * mm)
        fill = LIME if name == "Racha" else WHITE
        box(c, x, y - 92 * mm, ow, 92 * mm, fill)
        P(c, name, x + 6 * mm, y - 7 * mm, ow - 12 * mm, "card_title")
        P(c, price, x + 6 * mm, y - 20 * mm, ow - 12 * mm, "metric")
        bullet_list(c, items, x + 4 * mm, y - 42 * mm, ow - 8 * mm, gap=2.2 * mm)
    y -= 105 * mm
    data = [
        ["Grade futura", "Capacidade", "Preco de referencia", "Status"],
        ["Organizador", "100 atletas / ate 3 times", "R$ 229,90", "nao publicar"],
        ["Clube", "250 / ate 8", "R$ 599,90", "nao publicar"],
        ["Arena", "500 / ate 15", "R$ 1.099,90", "sob proposta"],
        ["Pro", "1.000 / ate 30", "R$ 2.199,90", "sob proposta"],
    ]
    y = draw_table(c, data, M, y, [40 * mm, 48 * mm, 43 * mm, 34 * mm], font_size=7.7)
    y -= 7 * mm
    P(c, "Nao oferecer anual antes de conhecer churn. Depois de 90 dias, referencia anual: R$ 799 para o plano Racha.", M, y, W - 2 * M, "body_small")
    c.showPage()

    # 6 - Unit economics SaaS
    new_page(c, 6, "Unit economics SaaS")
    y = page_title(c, "Piso economico", "R$ 79,90 fecha a conta no uso semanal adaptativo.",
                   "O modelo separa custo de canal, cobranca, tributo e infraestrutura. Margem bruta e margem de contribuicao nao sao a mesma metrica.")
    y -= 7 * mm
    data = [
        ["Componente por conta", "Premissa", "Valor"],
        ["WhatsApp operacional", "188 mensagens x R$ 0,065", "R$ 12,22"],
        ["OTP pelo WhatsApp", "7,5 solicitacoes x R$ 0,065", "R$ 0,49"],
        ["Cobranca", "4% do preco", "R$ 3,20"],
        ["Reserva tributaria", "6% do preco", "R$ 4,79"],
        ["Infra alocada", "R$ 300 / 100 pagantes", "R$ 3,00"],
        ["Contribuicao", "apos os itens acima", "R$ 56,20"],
    ]
    y = draw_table(c, data, M, y, [66 * mm, 64 * mm, 35 * mm], font_size=8.2)
    y -= 9 * mm
    box(c, M, y - 38 * mm, W - 2 * M, 38 * mm, LIME)
    P(c, "70,3%", M + 7 * mm, y - 7 * mm, 38 * mm, "metric")
    P(c, "margem de contribuicao no cenario adaptativo", M + 49 * mm, y - 8 * mm, 58 * mm, "card_title")
    P(c, "No estresse de tres disparos para todos, a contribuicao cai para aproximadamente 54%, ainda positiva.", M + 112 * mm, y - 7 * mm, W - 2 * M - 119 * mm, "body_small")
    y -= 50 * mm
    c.setFont("Arial-Bold", 9)
    c.setFillColor(INK)
    c.drawString(M, y, "Formula de piso")
    y -= 8 * mm
    box(c, M, y - 27 * mm, W - 2 * M, 27 * mm, INK, stroke=INK)
    P(c, "Preco minimo = (WhatsApp + OTP + infra) / (1 - cobranca - tributos - margem desejada)", M + 7 * mm, y - 8 * mm, W - 2 * M - 14 * mm, "body_white")
    y -= 37 * mm
    P(c, "A reserva de 4% e adequada ao Asaas no cenario base. Com Stripe Payments + Billing, usar 5,5% como reserva de cobranca.", M, y, W - 2 * M, "body_small")
    c.showPage()

    # 7 - Embedded economics
    new_page(c, 7, "Pagamentos embarcados")
    y = page_title(c, "Segunda avenida", "O volume processado aumenta valor sem virar receita integral.",
                   "GMV e o dinheiro movimentado. Receita DeuTime e somente assinatura, comissao e servicos efetivamente cobrados.")
    y -= 8 * mm
    examples = [
        ("Racha", "30 x R$ 40", "R$ 1.200", "R$ 24", "R$ 103,90"),
        ("Escola", "30 x R$ 120", "R$ 3.600", "R$ 72", "R$ 151,90"),
        ("Escola maior", "100 x R$ 150", "R$ 15.000", "R$ 300", "R$ 529,90"),
    ]
    data = [["Operacao", "Calculo", "GMV mensal", "Comissao 2%", "Receita + SaaS"]] + [list(r) for r in examples]
    y = draw_table(c, data, M, y, [31 * mm, 37 * mm, 34 * mm, 35 * mm, 36 * mm], font_size=7.8)
    y -= 10 * mm
    box(c, M, y - 51 * mm, 78 * mm, 51 * mm, LIME)
    P(c, "2%", M + 7 * mm, y - 7 * mm, 30 * mm, "metric")
    P(c, "take rate inicial", M + 7 * mm, y - 21 * mm, 45 * mm, "card_title")
    P(c, "Testar faixa de 1,5% a 2,5%, sempre sobre pagamento liquidado.", M + 7 * mm, y - 31 * mm, 62 * mm, "body_small")
    box(c, M + 85 * mm, y - 51 * mm, W - 2 * M - 85 * mm, 51 * mm, WHITE)
    P(c, "Minimo por transacao", M + 92 * mm, y - 7 * mm, 58 * mm, "card_title")
    P(c, "Para tickets muito baixos, testar 2,5% com minimo de R$ 0,99. Isso protege suporte, conciliacao e estorno sem esconder a tarifa.", M + 92 * mm, y - 18 * mm, W - M - (M + 99 * mm), "body")
    y -= 64 * mm
    bullet_list(c, [
        "A tarifa do processador deve ser paga pelo recebedor ou explicitamente embutida no preco.",
        "Chargeback, reembolso e inadimplencia precisam ter responsavel contratual definido.",
        "A comissao deve ser reconhecida quando o pagamento estiver liquidado, nao quando a cobranca for criada.",
    ], M, y, W - 2 * M)
    c.showPage()

    # 8 - Money flow
    new_page(c, 8, "Fluxo do dinheiro", dark=True)
    y = page_title(c, "Arquitetura financeira", "O DeuTime orquestra. O PSP custodia e liquida.",
                   "A conta comum do DeuTime nunca deve funcionar como carteira temporaria de atletas ou administradores.", dark=True)
    y -= 12 * mm
    nodes = [
        ("Atleta", "paga por cartao ou Pix"),
        ("PSP", "autoriza, custodia e concilia"),
        ("Split", "separa tarifa e comissao"),
        ("Recebedor", "time, escola ou administrador"),
    ]
    nw = 35 * mm
    gap = 8 * mm
    start = M
    for i, (name, desc) in enumerate(nodes):
        x = start + i * (nw + gap)
        fill = LIME if i == 1 else colors.HexColor("#15483D")
        box(c, x, y - 50 * mm, nw, 50 * mm, fill, stroke=colors.HexColor("#2A5C51"))
        P(c, name, x + 5 * mm, y - 8 * mm, nw - 10 * mm, "card_title" if i == 1 else "body_white")
        P(c, desc, x + 5 * mm, y - 23 * mm, nw - 10 * mm, "body_small" if i == 1 else "body_white")
        if i < 3:
            c.setStrokeColor(LIME)
            c.setLineWidth(1.6)
            c.line(x + nw, y - 25 * mm, x + nw + gap - 2 * mm, y - 25 * mm)
    y -= 68 * mm
    box(c, M, y - 43 * mm, W - 2 * M, 43 * mm, colors.HexColor("#15483D"), stroke=colors.HexColor("#2A5C51"))
    P(c, "Papel recomendado", M + 7 * mm, y - 9 * mm, 54 * mm, "section_white")
    P(c, "O time ou a escola e o recebedor identificado e, preferencialmente, o comerciante responsavel. O DeuTime e plataforma de software e recebe assinatura + application fee.", M + 64 * mm, y - 7 * mm, W - 2 * M - 71 * mm, "body_white")
    y -= 55 * mm
    bullet_list(c, [
        "Dados de cartao nunca passam pelos servidores do DeuTime.",
        "Saldo autoritativo pertence ao provedor; o banco local guarda projecao reconciliavel.",
        "Repasse, estorno e falha chegam por webhook assinado e idempotente.",
        "A liberacao de acesso nunca depende apenas do redirect do checkout.",
    ], M, y, W - 2 * M, dark=True)
    c.showPage()

    # 9 - Provider decision
    new_page(c, 9, "Decisao de provedor")
    y = page_title(c, "Shortlist", "Asaas para Brasil. Stripe Connect para escala global.",
                   "A escolha final depende de homologacao regulatoria, responsabilidade por perdas e disponibilidade real de meios de pagamento na conta contratada.")
    y -= 8 * mm
    data = [
        ["Criterio", "Asaas", "Stripe Connect", "Mercado Pago"],
        ["Subconta / conta conectada", "sim", "sim", "OAuth por vendedor"],
        ["Split automatico", "sim", "sim", "1:1 documentado"],
        ["Cartao recorrente", "sim", "excelente", "sim"],
        ["Pix Automatico", "sim", "nao presumir", "validar"],
        ["KYC e repasse", "sim", "sim", "sim"],
        ["Expansao internacional", "limitada", "superior", "limitada"],
        ["Aderencia DeuTime", "principal", "alternativa", "benchmark"],
    ]
    y = draw_table(c, data, M, y, [48 * mm, 40 * mm, 44 * mm, 37 * mm], font_size=7.5)
    y -= 10 * mm
    box(c, M, y - 38 * mm, W - 2 * M, 38 * mm, LIME)
    P(c, "Escolha inicial", M + 7 * mm, y - 7 * mm, 48 * mm, "card_title")
    P(c, "Asaas Subcontas + Split + Pix Automatico, sujeito a homologacao BaaS e proposta comercial. Stripe Connect fica como fallback se cartao, dunning ou internacionalizacao dominarem a demanda.", M + 59 * mm, y - 7 * mm, W - 2 * M - 66 * mm, "body")
    y -= 50 * mm
    P(c, "Nao escolher apenas pela taxa. O custo dominante em pagamentos embarcados pode ser suporte, fraude, chargeback, KYC incompleto e conciliacao - nao o MDR nominal.", M, y, W - 2 * M, "body_small")
    c.showPage()

    # 10 - WhatsApp journey
    new_page(c, 10, "Jornada de cobranca")
    y = page_title(c, "WhatsApp-first", "Cobrar sem constranger e sem perder controle.",
                   "A mensagem abre uma jornada segura; o pagamento acontece no checkout do provedor e volta ao DeuTime por webhook.")
    y -= 8 * mm
    steps = [
        ("1", "Gerar", "Cobranca vinculada ao atleta, time, competencia e recebedor."),
        ("2", "Enviar", "Template Utility com valor, vencimento e link seguro."),
        ("3", "Pagar", "Checkout hospedado; cartao ou Pix autorizado pelo PSP."),
        ("4", "Confirmar", "Webhook liquida, registra comissao e encerra lembretes."),
        ("5", "Repassar", "PSP envia saldo ao recebedor conforme agenda contratada."),
    ]
    for i, (num, name, desc) in enumerate(steps):
        yy = y - i * 27 * mm
        c.setFillColor(LIME if i in (1, 2) else INK)
        c.circle(M + 8 * mm, yy - 9 * mm, 7 * mm, fill=1, stroke=0)
        c.setFillColor(INK if i in (1, 2) else WHITE)
        c.setFont("Arial-Black", 12)
        c.drawCentredString(M + 8 * mm, yy - 12 * mm, num)
        P(c, name, M + 21 * mm, yy - 4 * mm, 33 * mm, "card_title")
        P(c, desc, M + 58 * mm, yy - 3 * mm, W - M - (M + 58 * mm), "body")
    y -= 140 * mm
    box(c, M, y - 34 * mm, W - 2 * M, 34 * mm, WARM)
    P(c, "Guardrail humano", M + 7 * mm, y - 7 * mm, 48 * mm, "card_title")
    P(c, "O produto lembra a obrigacao, nao expoe o inadimplente ao grupo. Mensagens financeiras sao individuais, consentidas, limitadas e interrompidas assim que o pagamento e confirmado.", M + 59 * mm, y - 7 * mm, W - 2 * M - 66 * mm, "body")
    c.showPage()

    # 11 - Riscos
    new_page(c, 11, "Riscos e governanca")
    y = page_title(c, "Nao e apenas uma feature", "Pagamentos criam uma operacao regulada por contratos e controles.")
    y -= 7 * mm
    risks = [
        ("KYC / recebedor", "Administrador e escola precisam de identidade, conta bancaria e situacao aprovadas."),
        ("Chargeback", "Definir quem responde, como o saldo negativo e coberto e quando o repasse pode ser retido."),
        ("Estorno", "Politica por cobranca, com auditoria, motivo e efeito no split."),
        ("Tributacao", "Separar receita DeuTime, GMV e valores do recebedor; validar nota fiscal e regime."),
        ("LGPD", "Minimizar CPF, dados bancarios e eventos financeiros; contratos com operadores."),
        ("Suporte", "Fila, SLA e runbook para pagamento duplicado, atraso, falha de repasse e conta bloqueada."),
    ]
    rw = (W - 2 * M - 6 * mm) / 2
    for i, (name, desc) in enumerate(risks):
        col = i % 2
        row = i // 2
        x = M + col * (rw + 6 * mm)
        yy = y - row * 48 * mm
        box(c, x, yy - 40 * mm, rw, 40 * mm, WHITE)
        P(c, name, x + 6 * mm, yy - 6 * mm, rw - 12 * mm, "card_title")
        P(c, desc, x + 6 * mm, yy - 18 * mm, rw - 12 * mm, "body_small")
    y -= 155 * mm
    box(c, M, y - 34 * mm, W - 2 * M, 34 * mm, INK, stroke=INK)
    P(c, "Gate de entrada", M + 7 * mm, y - 7 * mm, 42 * mm, "card_title_white")
    P(c, "Nao pilotar dinheiro real sem parecer juridico-contabil, contrato do PSP, termos com recebedores, politica de reembolso e simulacao de chargeback.", M + 54 * mm, y - 7 * mm, W - 2 * M - 61 * mm, "body_white")
    c.showPage()

    # 12 - Metrics
    new_page(c, 12, "Scorecard")
    y = page_title(c, "North stars", "Valor, receita e risco precisam caber no mesmo painel.")
    y -= 7 * mm
    data = [
        ["Dimensao", "Metrica", "Uso da decisao"],
        ["SaaS", "MRR, ARPA, churn, conversao", "provar disposicao de pagamento"],
        ["WhatsApp", "mensagens/elegivel, resposta por toque", "proteger margem e experiencia"],
        ["Cobranca", "GMV, liquidacao, inadimplencia", "provar valor financeiro"],
        ["Receita", "take rate liquido, receita por time", "medir monetizacao real"],
        ["Risco", "chargeback, estorno, fraude, saldo negativo", "controlar perdas"],
        ["Operacao", "minutos de suporte por conta", "medir custo oculto"],
        ["Repasse", "sucesso, prazo, falha por recebedor", "garantir confianca"],
    ]
    y = draw_table(c, data, M, y, [35 * mm, 69 * mm, 65 * mm], font_size=7.8)
    y -= 11 * mm
    cards = [
        ("< 2%", "churn mensal alvo apos validacao"),
        ("> 90%", "cobrancas liquidadas no prazo"),
        ("< 0,5%", "chargeback sobre GMV"),
        ("< 15 min", "suporte mensal por conta"),
    ]
    cw = (W - 2 * M - 9 * mm) / 4
    for i, (mtr, label) in enumerate(cards):
        x = M + i * (cw + 3 * mm)
        box(c, x, y - 38 * mm, cw, 38 * mm, LIME if i == 1 else WHITE)
        P(c, mtr, x + 4 * mm, y - 6 * mm, cw - 8 * mm, "metric")
        P(c, label, x + 4 * mm, y - 21 * mm, cw - 8 * mm, "body_small")
    y -= 49 * mm
    P(c, "Os thresholds sao hipoteses de controle, nao promessas. Devem ser recalibrados com coorte real e pelo contrato do PSP.", M, y, W - 2 * M, "body_small")
    c.showPage()

    # 13 - GTM
    new_page(c, 13, "Plano de 90 dias")
    y = page_title(c, "Validacao comercial", "Cobrar cedo. Integrar pagamentos depois.")
    y -= 8 * mm
    phases = [
        ("0-30 dias", "20 times", ["R$ 59,90 por 90 dias", "cobranca do SaaS por link", "medir uso e suporte", "sem split em producao"]),
        ("31-60 dias", "35 times", ["novos a R$ 79,90", "entrevistar escolas", "prototipo de cobranca", "proposta Asaas / Stripe"]),
        ("61-90 dias", "50 times", ["dois ciclos completos", "fechar preco anual", "decidir PSP", "CP0 da vertical financeira"]),
    ]
    pw = (W - 2 * M - 10 * mm) / 3
    for i, (period, target, items) in enumerate(phases):
        x = M + i * (pw + 5 * mm)
        box(c, x, y - 99 * mm, pw, 99 * mm, LIME if i == 0 else WHITE)
        P(c, period, x + 6 * mm, y - 7 * mm, pw - 12 * mm, "card_title")
        P(c, target, x + 6 * mm, y - 21 * mm, pw - 12 * mm, "metric")
        bullet_list(c, items, x + 4 * mm, y - 45 * mm, pw - 8 * mm, gap=2.6 * mm)
    y -= 112 * mm
    box(c, M, y - 38 * mm, W - 2 * M, 38 * mm, SOFT)
    P(c, "Regra de promocao", M + 7 * mm, y - 7 * mm, 50 * mm, "card_title")
    P(c, "A vertical de pagamentos so entra em implementacao quando houver pelo menos 3 clientes reais pedindo cobranca, recebedor definido e viabilidade contratual com o PSP.", M + 62 * mm, y - 7 * mm, W - 2 * M - 69 * mm, "body")
    c.showPage()

    # 14 - Gates
    new_page(c, 14, "Roadmap de negocio")
    y = page_title(c, "Quatro gates", "Escalar risco somente depois de escalar evidencia.")
    y -= 7 * mm
    gates = [
        ("G0", "SaaS pago", "20 pagantes e dois ciclos de uso", "Preco e entrega validados"),
        ("G1", "Descoberta financeira", "3 clientes com dor e dados de cobranca", "Modelo recebedor aceito"),
        ("G2", "Piloto de pagamentos", "1 escola + 1 racha, limite de GMV", "Split, estorno e repasse provados"),
        ("G3", "Escala controlada", "KYC, suporte, fraude e reconciliacao estaveis", "Rollout por coorte"),
    ]
    for i, (code, name, entry, exit_) in enumerate(gates):
        yy = y - i * 43 * mm
        c.setFillColor(LIME if i == 0 else INK)
        c.roundRect(M, yy - 32 * mm, 28 * mm, 32 * mm, 5 * mm, fill=1, stroke=0)
        c.setFillColor(INK if i == 0 else WHITE)
        c.setFont("Arial-Black", 15)
        c.drawCentredString(M + 14 * mm, yy - 19 * mm, code)
        P(c, name, M + 35 * mm, yy - 5 * mm, 40 * mm, "card_title")
        P(c, "Entrada: " + entry, M + 80 * mm, yy - 5 * mm, 48 * mm, "body_small")
        P(c, "Saida: " + exit_, M + 133 * mm, yy - 5 * mm, W - M - (M + 133 * mm), "body_small")
    y -= 180 * mm
    box(c, M, y - 33 * mm, W - 2 * M, 33 * mm, WARM)
    P(c, "Sem atalho", M + 7 * mm, y - 7 * mm, 37 * mm, "card_title")
    P(c, "Escolas ampliam ticket e recorrencia, mas tambem exigem responsaveis, turmas, contratos, suporte e cobranca formal. Sao uma expansao de segmento, nao apenas um novo plano.", M + 49 * mm, y - 7 * mm, W - 2 * M - 56 * mm, "body")
    c.showPage()

    # 15 - Scenarios
    new_page(c, 15, "Cenarios financeiros")
    y = page_title(c, "Escala ilustrativa", "Pagamentos aumentam ARPA antes de exigir milhares de times.",
                   "Os cenarios abaixo sao uma ferramenta de planejamento. Nao sao forecast nem incluem CAC, equipe ou pro-labore.")
    y -= 8 * mm
    data = [
        ["Times pagos", "MRR SaaS", "Times com cobranca", "GMV", "Receita 2%", "Receita total"],
        ["20", "R$ 1.598", "0", "R$ 0", "R$ 0", "R$ 1.598"],
        ["50", "R$ 3.995", "10", "R$ 30 mil", "R$ 600", "R$ 4.595"],
        ["100", "R$ 7.990", "30", "R$ 90 mil", "R$ 1.800", "R$ 9.790"],
        ["300", "R$ 23.970", "120", "R$ 360 mil", "R$ 7.200", "R$ 31.170"],
    ]
    y = draw_table(c, data, M, y, [27 * mm, 30 * mm, 38 * mm, 29 * mm, 28 * mm, 30 * mm], font_size=7.3)
    y -= 12 * mm
    # Simple bars for total revenue
    totals = [(20, 1598), (50, 4595), (100, 9790), (300, 31170)]
    maxv = max(v for _, v in totals)
    c.setFont("Arial-Bold", 8)
    c.setFillColor(INK)
    c.drawString(M, y, "Receita mensal ilustrativa")
    y -= 9 * mm
    for teams, val in totals:
        c.setFont("Arial", 7.5)
        c.setFillColor(MUTED)
        c.drawRightString(M + 20 * mm, y - 3 * mm, f"{teams} times")
        bw = (W - 2 * M - 62 * mm) * val / maxv
        c.setFillColor(LIME if teams < 300 else INK)
        c.roundRect(M + 25 * mm, y - 7 * mm, bw, 7 * mm, 3.5 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Arial-Bold", 7.5)
        c.drawString(M + 28 * mm + bw, y - 5 * mm, f"R$ {val:,.0f}".replace(",", "."))
        y -= 15 * mm
    y -= 4 * mm
    box(c, M, y - 40 * mm, W - 2 * M, 40 * mm, SOFT)
    P(c, "Leitura", M + 7 * mm, y - 7 * mm, 32 * mm, "card_title")
    P(c, "A camada financeira eleva receita por conta, mas seu valor so aparece se o DeuTime mantiver inadimplencia, fraude, suporte e repasse sob controle.", M + 44 * mm, y - 7 * mm, W - 2 * M - 51 * mm, "body")
    c.showPage()

    # 16 - Sources and decision checklist
    new_page(c, 16, "Metodo e fontes")
    y = page_title(c, "Checklist de decisao", "O que precisa ser verdade antes do dinheiro real.")
    y -= 7 * mm
    checks = [
        "Preco SaaS validado com clientes pagantes, nao apenas interesse declarado.",
        "Recebedor juridico e responsabilidade por perdas definidos.",
        "PSP homologado para subcontas, split, recorrencia e volume esperado.",
        "Fluxos de KYC, estorno, chargeback, cancelamento e suporte aprovados.",
        "Projecao financeira reconciliavel e auditoria sem dados sensiveis em logs.",
        "Piloto limitado por time, GMV, prazo e kill switch.",
    ]
    y = bullet_list(c, checks, M, y, W - 2 * M, gap=2.6 * mm)
    y -= 6 * mm
    c.setFont("Arial-Bold", 9)
    c.setFillColor(INK)
    c.drawString(M, y, "Fontes principais consultadas")
    y -= 7 * mm
    sources = [
        "DeuTime: roadmap, arquitetura, releases de WhatsApp e estudo de pricing v2.",
        "Twilio: twilio.com/pt-br/whatsapp/pricing e twilio.com/pt-br/verify/pricing.",
        "Supabase: supabase.com/pricing e documentacao de Phone Login.",
        "Vercel: vercel.com/pricing.",
        "Asaas: asaas.com/precos-e-taxas; docs.asaas.com/docs/criacao-de-subcontas; split-de-pagamentos; pix-automatico.",
        "Stripe: stripe.com/br/pricing; stripe.com/br/connect/pricing; docs.stripe.com/connect/subscriptions.",
        "Mercado Pago: documentacao de Assinaturas e Split de Pagamentos 1:1.",
    ]
    for s in sources:
        y = P(c, s, M, y, W - 2 * M, "body_small") - 2 * mm
    y -= 5 * mm
    box(c, M, y - 42 * mm, W - 2 * M, 42 * mm, INK, stroke=INK)
    P(c, "Recomendacao final", M + 7 * mm, y - 10 * mm, 54 * mm, "section_white")
    P(c, "Vender o SaaS agora. Descobrir pagamentos com clientes reais. Quando entrar, usar Asaas como candidato Brasil-first, Stripe Connect como alternativa e manter o DeuTime fora da custodia direta.", M + 66 * mm, y - 7 * mm, W - 2 * M - 73 * mm, "body_white")
    c.showPage()

    c.save()


if __name__ == "__main__":
    build()
    print(OUT)
