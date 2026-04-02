import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [nickname, setNickname] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMatches, setOpenMatches] = useState({});
  const [offset, setOffset] = useState(0);
  const LIMIT = 5;

  const handleSearch = async (e, isMore = false) => {
    if (e) e.preventDefault();
    if (!nickname) return;

    setLoading(true);
    const nextOffset = isMore ? offset + LIMIT : 0;

    try {
          const response = await axios.get(
        `https://sniper-service-1047111187894.asia-northeast3.run.app/api/sniper/analyze/${nickname}?offset=${nextOffset}&limit=${LIMIT}`
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
      }
      setOffset(nextOffset);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      alert("백엔드 서버와 통신할 수 없습니다. 서버 실행 상태를 확인하세요!");
    } finally {
      setLoading(false);
    }
  };

  const toggleMatch = (matchId) => {
    setOpenMatches(prev => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  return (
    <div className="dak-container">
      <nav className="dak-nav">
        <div className="container">
          <span className="logo">🎯 PUBG.SNIPER <small>Team Radar</small></span>
        </div>
      </nav>

      <div className="container mt-5">
        <div className="search-section text-center mb-5">
          <h1 className="fw-bold mb-3">저격수 & 일당 검거 리포트</h1>
          <p className="text-muted">나와 우리 팀을 노린 저격수와 그 팀원들의 교전 기록을 전수조사합니다.</p>
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
              <span className="name">{result.targetPlayer}</span>
              <span className="status-tag">누적 {result.matchHistory.length}경기 분석됨</span>
            </div>

            {result.matchHistory.length > 0 ? (
              result.matchHistory.map((match, idx) => {
                // 🚨 매치 내에 저격수 본인 혹은 저격수 팀원이 있는지 체크
                const hasSniper = match.encounters?.some(enc => enc.sniperType === 'SNIPER');
                const hasSniperTeam = match.encounters?.some(enc => enc.sniperType === 'SNIPER_TEAM');
                const isAlertMatch = hasSniper || hasSniperTeam;
                const isOpen = !!openMatches[match.matchId];

                return (
                  <div key={`${match.matchId}-${idx}`} className={`match-card mb-2 ${isOpen ? 'active' : ''}`}>
                    {/* 매치 요약 바 */}
                    <div 
                      className={`match-bar ${hasSniper ? 'has-sniper' : hasSniperTeam ? 'has-sniper-team' : ''}`} 
                      onClick={() => toggleMatch(match.matchId)}
                    >
                      <div className="bar-left">
                        <div className="rank-badge">
                          <span className={match.rank === 1 ? 'rank-val winner' : 'rank-val'}>
                            #{match.rank || '?'}
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
                        {match.rank === 1 && <span className="chicken-icon">🍗</span>}
                      </div>

                      <div className="bar-right">
                        {hasSniper && <span className="sniper-alert pulse">🚨 저격 본인 검거</span>}
                        {!hasSniper && hasSniperTeam && <span className="sniper-team-alert">⚠️ 저격 일당 색출</span>}
                        <span className={`arrow-icon ms-2 ${isOpen ? 'up' : 'down'}`}>▼</span>
                      </div>
                    </div>

                    {/* 상세 교전 내역 (아코디언) */}
                    <div className={`match-details ${isOpen ? 'show' : ''}`}>
                      <div className="encounter-content">
                        {match.encounters && match.encounters.length > 0 ? (
                          match.encounters.map((enc, i) => {
                            const isSniperKill = enc.sniperType === 'SNIPER';
                            const isSniperTeamKill = enc.sniperType === 'SNIPER_TEAM';
                            
                            // 내가 주체인지 팀원이 주체인지 판단
                            const isMeAttacker = enc.attacker.toLowerCase() === nickname.toLowerCase();
                            const isMeVictim = enc.victim.toLowerCase() === nickname.toLowerCase();

                            // 텍스트 조립
                            const myTeamEntity = enc.action === 'KILL' 
                                ? (isMeAttacker ? '나' : `팀원(${enc.attacker})`) 
                                : (isMeVictim ? '나' : `팀원(${enc.victim})`);
                            
                            const enemyEntity = enc.action === 'KILL' ? enc.victim : enc.attacker;

                            return (
                              <div key={i} className={`enc-row ${isSniperKill ? 'detected' : isSniperTeamKill ? 'team-detected' : ''}`}>
                                <div className="enc-main">
                                  <span className="victim-name">{myTeamEntity}</span>
                                  <span className="vs-text">님이</span>
                                  
                                  <span className={`player-name ${isSniperKill ? 'sniper-name' : isSniperTeamKill ? 'sniper-team-name' : ''}`}>
                                    {enemyEntity}
                                  </span>
                                  <span className="vs-text">{enc.action === 'KILL' ? '을(를)' : '에게'}</span>
                                  
                                  <span className={`action-tag ${enc.action}`}>
                                    {enc.action === 'KILL' ? '처치' : '사망'}
                                  </span>
                                  <span className="weapon-name">[{enc.weapon}]</span>
                                </div>
                                <div className="enc-sub">
                                  <span className="distance">{Math.round(enc.distance)}m</span>
                                  {isSniperKill && <span className="sniper-badge pulse-small">🚨 저격 본인</span>}
                                  {isSniperTeamKill && <span className="sniper-team-badge">⚠️ 저격팀원</span>}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="no-data">우리 팀과 저격수 간의 직접적인 교전이 없습니다.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-5 text-muted">분석 가능한 최근 경기 데이터가 없습니다.</div>
            )}

            <div className="text-center mt-4 mb-5">
              <button className="btn-load-more" onClick={() => handleSearch(null, true)} disabled={loading}>
                {loading ? '데이터 불러오는 중...' : '다음 5경기 더 보기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;