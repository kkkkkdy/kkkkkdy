import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const procedures = [
  { lane: '기업', name: '투자계획 수립', period: '10일', status: '필수', category: '투자' },
  { lane: '산단관리', name: '산업단지 입주계약', period: '10일', status: '필수', category: '산업단지' },
  { lane: '지자체', name: '공장설립 관련 승인', period: '20일', status: '필수', category: '공장' },
  { lane: '환경', name: '환경 관련 검토', period: '15일', status: '조건부', category: '환경' },
  { lane: '건축', name: '건축허가/신고', period: '10일', status: '필수', category: '건축' },
  { lane: '소방', name: '소방시설 관련 절차', period: '7일', status: '조건부', category: '소방' },
  { lane: '전력', name: '전력공급 협의', period: '30일', status: '확인 필요', category: '전력' },
  { lane: '용수', name: '용수공급 협의', period: '20일', status: '조건부', category: '용수' },
  { lane: '기업', name: '공장등록', period: '3일', status: '필수', category: '공장' },
];

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">R</span><div><b>Regional</b><small>Investment Engine</small></div></div>
        <nav>
          <a className="active">▦　프로젝트 대시보드</a>
          <a>⌁　인허가 절차</a>
          <a>⚖　법령 데이터</a>
          <a>◇　Rule Engine</a>
          <a>◫　프로젝트 관리</a>
        </nav>
        <div className="sidebar-bottom"><div>법령 데이터</div><strong>검증 상태 96%</strong><div className="progress"><i /></div><small>최근 검증 2026.08.21</small></div>
      </aside>

      <main>
        <header className="topbar"><div><span className="eyebrow">PROJECT / 2026-001</span><h1>지방투자 인허가 Process Dashboard</h1></div><div className="top-actions"><button>↻ 법령 최신화</button><button className="primary">+ 새 프로젝트</button></div></header>

        <section className="project-card">
          <div className="project-head"><div><span className="tag">분석 결과</span><h2>전북 군산시 반도체 제조공장 신설</h2><p>일반산업단지 · 신규 투자 · 제조업 · 법령 기반 자동 판정</p></div><div className="verified">● VERIFIED<br/><small>법령 근거 검증</small></div></div>
          <div className="metrics">
            <Metric label="전체 절차" value="24" unit="개" />
            <Metric label="필수" value="15" unit="개" tone="blue" />
            <Metric label="조건부" value="7" unit="개" tone="amber" />
            <Metric label="확인 필요" value="2" unit="개" tone="red" />
            <Metric label="일반 예상기간" value="8.5" unit="개월" tone="purple" />
          </div>
        </section>

        <section className="filters"><div className="filter-title">투자 조건</div><Filter label="투자유형" value="신규 공장"/><Filter label="업종" value="반도체 제조"/><Filter label="지역" value="전북 · 군산시"/><Filter label="입지" value="일반산업단지"/><Filter label="공장규모" value="50,000㎡"/><Filter label="전력" value="80 MW"/><Filter label="용수" value="8,000㎥/일"/><Filter label="폐수" value="예"/></section>

        <section className="content-head"><div><h2>인허가 Swimlane</h2><p>선행·병렬 관계를 고려한 프로젝트 진행 흐름</p></div><div className="legend"><span className="dot required"/>필수 <span className="dot conditional"/>조건부 <span className="dot review"/>확인 필요</div></section>

        <section className="swimlane">
          <div className="timeline"><span>투자검토</span><span>입지선정</span><span>인허가</span><span>착공</span><span>건축·설비</span><span>사용승인</span><span>공장등록</span><span>가동</span></div>
          {['기업','산단관리','지자체','환경','건축','소방','전력','용수'].map((lane, index) => <Lane key={lane} lane={lane} index={index} />)}
        </section>
      </main>
    </div>
  );
}

function Metric({label,value,unit,tone='' }: {label:string;value:string;unit:string;tone?:string}) { return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}<em>{unit}</em></strong></div> }
function Filter({label,value}:{label:string;value:string}) { return <div className="filter"><small>{label}</small><strong>{value}</strong><span>⌄</span></div> }
function Lane({lane,index}:{lane:string;index:number}) { const laneItems = procedures.filter(p=>p.lane===lane); return <div className="lane"><div className="lane-name"><b>{lane}</b><small>{laneItems.length}개 절차</small></div><div className="lane-track">{laneItems.map((p,i)=><div key={p.name} className={`procedure ${p.status==='필수'?'required':p.status==='조건부'?'conditional':'review'}`} style={{left:`${8 + ((index*11+i*19)%78)}%`}}><strong>{p.name}</strong><small>{p.period} · {p.status}</small><span>{p.category}</span></div>)}</div></div> }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
