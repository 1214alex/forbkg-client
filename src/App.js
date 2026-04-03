import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';

// ----------------------------------------------------------------------
// ✅ 1. 헬퍼 함수 분리 (컴포넌트 밖으로 빼서 불필요한 재생성 방지)
// ----------------------------------------------------------------------
const getActionText = (action) => {
  switch(action) {
    case 'KILL': return '확정킬';
    case 'DEATH': return '사망';
    case 'KNOCK': return '기절시킴';
    case 'KNOCKED': return '기절당함';
    case 'TEAM_KILL': return '팀킬(사망)';
    case 'TEAM_KNOCK': return '팀킬(기절)';
    default: return action;
  }
};

const renderBadge = (type) => {
  if (type === 'SNIPER') return <span className="sniper-badge pulse-small">🚨 저격 본인</span>;
  if (type === 'STREAMER') return <span className="streamer-badge">🎥 방송인</span>;
  if (type === 'SNIPER_TEAM') return <span className="sniper-team-badge">⚠️ 저격팀원</span>;
  if (type === 'STREAMER_TEAM') return <span className="streamer-team-badge" style={{ backgroundColor: '#69b1ff', color: 'white', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', marginLeft: '5px' }}>👥 방송인팀</span>;
  return null;
};

// ----------------------------------------------------------------------
// ✅ 2. 자식 컴포넌트 분리 (React.memo를 씌워서 렌더링 방어)
// ----------------------------------------------------------------------
const MatchCard = React.memo(({ match, safeNickname, isOpen, onToggle, onQuickSearch }) => {
  const hasSniper = match.encounters?.some(enc => enc.sniperType === 'SNIPER');
  const hasStreamer = match.encounters?.some(enc => enc.sniperType === 'STREAMER');
  const hasSniperTeam = match.encounters?.some(enc => enc.sniperType === 'SNIPER_TEAM');
  const hasStreamerTeam = match.encounters?.some(enc => enc.sniperType === 'STREAMER_TEAM');
  
  let matchBarClass = 'match-bar';
  if (hasSniper) matchBarClass += ' has-sniper';
  else if (hasStreamer) matchBarClass += ' has-streamer';
  else if (hasSniperTeam) matchBarClass += ' has-sniper-team';
  else if (hasStreamerTeam) matchBarClass += ' has-streamer-team';

  return (
    <div className={`match-card mb-2 ${isOpen ? 'active' : ''}`}>
      <div className={matchBarClass} onClick={() => onToggle(match.matchId)}>
        <div className="bar-left">
          <div className="rank-badge">
            <span className={(match.myRank || match.rank) === 1 ? 'rank-val winner' : 'rank-val'}>
              #{(match.myRank || match.rank) || '?'}
            </span>
          </div>
          <div className="match-info">
            <span className="map-name">{match.mapName}</span>
            <span className="time">{match.matchDate}</span>
          </div>
        </div>
        
        <div className="bar-mid">
          <span className="kill-label">MY KILLS</span> 
          <span className="kill-val">{match.myKills}</span>
          {(match.myRank || match.rank) === 1 && <span className="chicken-icon">🍗</span>}
        </div>

        <div className="bar-right">
          {hasSniper && <span className="sniper-alert pulse">🚨 저격 검거</span>}
          {hasStreamer && !hasSniper && <span className="streamer-alert">🎥 방송인 매치</span>}
          {hasSniperTeam && !hasSniper && !hasStreamer && <span className="sniper-team-alert">⚠️ 저격팀 감지</span>}
          {hasStreamerTeam && !hasSniper && !hasStreamer && !hasSniperTeam && <span className="streamer-team-alert" style={{ background: '#69b1ff', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>👥 방송인팀 매치</span>}
          <span className={`arrow-icon ms-2 ${isOpen ? 'up' : 'down'}`}>▼</span>
        </div>
      </div>

      <div className={`match-details ${isOpen ? 'show' : ''}`}>
        <div className="encounter-content">
          {match.encounters && match.encounters.length > 0 ? (
            match.encounters.map((enc, i) => {
              const killerName = enc.killerName || enc.attacker || "";
              const victimName = enc.victimName || enc.victim || "";

              const isMeAttacker = killerName.toLowerCase() === safeNickname;
              const isMeVictim = victimName.toLowerCase() === safeNickname;

              const isMyTeamAction = enc.action === 'KILL' || enc.action === 'KNOCK' || enc.action === 'TEAM_KILL' || enc.action === 'TEAM_KNOCK';

              const myTeamEntity = isMyTeamAction 
                  ? (isMeAttacker ? '나' : `팀원(${killerName})`) 
                  : (isMeVictim ? '나' : `팀원(${victimName})`);
              
              const enemyEntity = isMyTeamAction ? victimName : killerName;

              let rowClass = 'enc-row';
              if (enc.sniperType === 'SNIPER') rowClass += ' detected';
              else if (enc.sniperType === 'STREAMER') rowClass += ' streamer-detected';

              return (
                <div key={i} className={rowClass}>
                  <div className="enc-main">
                    <span className="victim-name">{myTeamEntity}</span>
                    <span className="vs-text">님이</span>
                    
                    <span 
                      className={`player-name clickable ${enc.sniperType === 'SNIPER' ? 'sniper-name' : enc.sniperType === 'STREAMER' ? 'streamer-name' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation(); // 클릭 시 아코디언 닫히는 현상 방지
                        onQuickSearch(enemyEntity);
                      }}
                    >
                      {enemyEntity}
                    </span>
                    {renderBadge(enc.sniperType)}

                    <span className="vs-text">{isMyTeamAction ? '을(를)' : '에게'}</span>
                    
                    <span className={`action-tag action-${enc.action.toLowerCase()}`}>
                      {getActionText(enc.action)}
                    </span>
                    <span className="weapon-name">[{enc.weapon || '주먹/차량'}]</span>
                  </div>
                  <div className="enc-sub">
                    <span className="distance">{Math.round(enc.distance || 0)}m</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-data">우리 팀과 저격수/방송인 간의 직접적인 교전이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
});

// ----------------------------------------------------------------------
// ✅ 3. 부모 컴포넌트 (상태 관리 중심)
// ----------------------------------------------------------------------
function App() {
  const [nickname, setNickname] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMatches, setOpenMatches] = useState({});
  const [offset, setOffset] = useState(0);
  const LIMIT = 5;

  // const API_BASE_URL = 'http://localhost:8080/api/sniper/analyze';
  const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}/api/sniper/analyze`;



  // 검색 로직
  const handleSearch = async (e, isMore = false, targetName = nickname) => {
    if (e) e.preventDefault();
    if (!targetName) return;

    setLoading(true);
    const nextOffset = isMore ? offset + LIMIT : 0;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/${targetName}?offset=${nextOffset}&limit=${LIMIT}`
      );
      const data = response.data;

      if (isMore) {
        setResult(prev => ({
          ...prev,
          matchHistory: [...prev.matchHistory, ...data.matchHistory]
        }));
      } else {
        setResult(data);
        setOpenMatches({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setOffset(nextOffset);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      alert("데이터 로드 실패! 서버 상태나 닉네임 대소문자를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ useCallback으로 함수 재생성 방지 (자식 컴포넌트 리렌더링 방어막)
  const handleQuickSearch = useCallback((name) => {
    setNickname(name);
    handleSearch(null, false, name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, nickname]); 

  const toggleMatch = useCallback((matchId) => {
    setOpenMatches(prev => ({ ...prev, [matchId]: !prev[matchId] }));
  }, []);

  return (
    <div className="dak-container">
      <nav className="dak-nav">
        <div className="container">
          <span className="logo" onClick={() => window.location.reload()} style={{cursor:'pointer'}}>
            🎯 PUBG <small>Team Radar</small>
          </span>
        </div>
      </nav>

      <div className="container mt-5">
        <div className="search-section text-center mb-5">
          <h1 className="fw-bold mb-3">저격러 & 팀원 검거</h1>
          <p className="text-muted">나와 우리 팀을 노린 저격수와 방송인, 그 팀원들의 교전 기록을 분석.</p>
          
          <form onSubmit={(e) => handleSearch(e, false)} className="dak-search-form mt-4 shadow-sm">
            <input 
              type="text" 
              placeholder="배그 닉네임 입력 (대소문자 정확히)..." 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {loading && !offset ? '분석 중...' : '조회하기'}
            </button>
          </form> 
        </div>

        {result && result.matchHistory && (
          <div className="history-section animate-fade-in">
            <div className="user-profile mb-4">
              <span className="name">{result.nickname || result.targetPlayer}</span>
              <span className="status-tag">최근 {result.matchHistory.length}경기 분석됨</span>
            </div>

            {result.matchHistory.length > 0 ? (
              result.matchHistory.map((match) => {
                const safeNickname = (result.nickname || result.targetPlayer || "").toLowerCase();
                
                return (
                  <MatchCard 
                    key={match.matchId}
                    match={match}
                    safeNickname={safeNickname}
                    isOpen={!!openMatches[match.matchId]}
                    onToggle={toggleMatch}
                    onQuickSearch={handleQuickSearch}
                  />
                );
              })
            ) : (
              <div className="text-center py-5 text-muted">분석 가능한 최근 경기 데이터가 없습니다.</div>
            )}

            <div className="text-center mt-4 mb-5">
              <button className="btn-load-more" onClick={() => handleSearch(null, true)} disabled={loading}>
                {loading ? '불러오는 중...' : '다음 5경기 더 보기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;