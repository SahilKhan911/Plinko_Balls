import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaChevronDown } from 'react-icons/fa';
import './App.css';

// Styled components
const BoardContainer = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Board = styled.div`
  width: 100%;
  height: ${props => props.rows * 50 + 150}px; // Increased height per row and padding
  min-height: 500px;
  max-height: 900px; // Increased max height
  background: #1a2035;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 30px;
`;

const Ball = styled.div`
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => 
    props.risk === 'high' ? '#ff4d4d' :
    props.risk === 'medium' ? '#ffcc00' : '#4dff4d'};
  transform: translate(-50%, -50%);
  z-index: 10;
  box-shadow: 0 0 10px currentColor;
  will-change: transform;
`;

const Peg = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #8a8f98;
  transform: translate(-50%, -50%);
`;

const MultiplierBin = styled.div`
  position: absolute;
  bottom: 0;
  height: 30px;
  width: ${props => props.width}px;
  left: ${props => props.left}px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  background: rgba(76, 175, 80, ${props => 0.1 + props.multiplier * 0.02});
  border-radius: 4px 4px 0 0;
  z-index: 5;
`;

const getMultipliersByRisk = (risk) => {
  switch(risk) {
    case 'high':
      return [10, 5, 3, 2, 1.5, 1, 0.6, 0.4, 0.2, 0.4, 0.6, 1, 1.5, 2, 3, 5, 10];
    case 'medium':
      return [5, 3, 2, 1.5, 1.2, 1, 0.8, 0.6, 0.8, 1, 1.2, 1.5, 2, 3, 5];
    default: // low
      return [3, 2, 1.5, 1.2, 1.1, 1, 0.9, 1, 1.1, 1.2, 1.5, 2, 3];
  }
};

const PlinkoBoard = ({ risk, onScore }) => {
  const [balls, setBalls] = useState([]);
  const [activeBalls, setActiveBalls] = useState([]);
  const boardRef = useRef(null);
  const [pegs, setPegs] = useState([]);
  const [multipliers] = useState(getMultipliersByRisk(risk));

  const generatePegs = (boardWidth, startY = 80) => {
    const rows = risk === 'high' ? 12 : risk === 'medium' ? 9 : 6;
    const pegSpacing = Math.min(40, (boardWidth - 80) / (rows + 2)); // Responsive spacing
    const pegs = [];

    // Add top row with exactly 3 pegs
    const topRowWidth = pegSpacing * 2;
    const topStartX = (boardWidth - topRowWidth) / 2;
    for (let i = 0; i < 3; i++) {
      pegs.push({
        id: `top-${i}`,
        x: topStartX + i * pegSpacing,
        y: startY,
        radius: 4 // Slightly smaller pegs
      });
    }

    // Add subsequent rows with increasing pegs
    for (let row = 1; row < rows; row++) {
      const pegCount = row + 3; // Start with 4 pegs in second row
      const rowWidth = (pegCount - 1) * pegSpacing;
      const startX = (boardWidth - rowWidth) / 2;
      const rowY = startY + row * pegSpacing * 1.2; // Increased vertical spacing

      for (let col = 0; col < pegCount; col++) {
        pegs.push({
          id: `${row}-${col}`,
          x: startX + col * pegSpacing,
          y: rowY,
          radius: 4
        });
      }
    }
    return pegs;
  };

  useEffect(() => {
    if (boardRef.current) {
      setPegs(generatePegs(boardRef.current.clientWidth));
    }
  }, [risk]);

  useEffect(() => {
    if (!boardRef.current || pegs.length === 0) return;

    const boardHeight = boardRef.current.clientHeight - 50; // Leave space for multiplier bins
    const boardWidth = boardRef.current.clientWidth;
    const gravity = 0.25;
    const damping = 0.5;
    const friction = 0.98;
    const pegRadius = 4;
    const ballRadius = 8;
    const collisionRadius = pegRadius + ballRadius;

    let animationFrameId;

    const updateBallPositions = () => {
      setActiveBalls(prevBalls => {
        return prevBalls.map(ball => {
          if (ball.landed) return ball;

          let { x, y, vx, vy } = ball;

          // Apply gravity
          vy += gravity;
          
          // Apply air resistance
          vx *= friction;
          vy *= friction;

          // Check collisions with pegs
          for (const peg of pegs) {
            const dx = x - peg.x;
            const dy = y - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < collisionRadius) {
              const nx = dx / distance;
              const ny = dy / distance;
              const dotProduct = (vx * nx + vy * ny);
              
              vx = (vx - 2 * dotProduct * nx) * damping;
              vy = (vy - 2 * dotProduct * ny) * damping;
              
              x = peg.x + nx * collisionRadius * 1.1;
              y = peg.y + ny * collisionRadius * 1.1;
              break;
            }
          }

          // Wall collisions
          if (x <= ballRadius) {
            x = ballRadius;
            vx = Math.abs(vx) * damping;
          } else if (x >= boardWidth - ballRadius) {
            x = boardWidth - ballRadius;
            vx = -Math.abs(vx) * damping;
          }

          // Update position
          x += vx;
          y += vy;

          // Check if ball reached bottom with a small buffer
          if (y > boardHeight - 30) { // Added buffer for multiplier bins
            const binWidth = boardWidth / multipliers.length;
            const binIndex = Math.min(Math.floor(x / binWidth), multipliers.length - 1);
            onScore(multipliers[binIndex]);
            return { ...ball, landed: true };
          }

          return { ...ball, x, y, vx, vy };
        }).filter(ball => !ball.landed);
      });

      animationFrameId = requestAnimationFrame(updateBallPositions);
    };

    animationFrameId = requestAnimationFrame(updateBallPositions);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [pegs, onScore, multipliers]);

  const dropBall = () => {
    const newBall = {
      id: Date.now(),
      x: boardRef.current?.clientWidth / 2 || 400,
      y: 40,
      vx: (Math.random() - 0.5) * 2, // Reduced initial velocity
      vy: 0.5, // Reduced initial downward velocity
      radius: 8,
      risk,
      landed: false
    };
    setActiveBalls(prev => [...prev, newBall]);
  };

  return (
    <BoardContainer>
      <h1>Plinko Game</h1>
      <Board ref={boardRef} rows={risk === 'high' ? 12 : risk === 'medium' ? 9 : 6}>
        {pegs.map(peg => (
          <Peg 
            key={peg.id}
            style={{
              left: `${peg.x}px`,
              top: `${peg.y}px`,
              width: `${peg.radius * 2}px`,
              height: `${peg.radius * 2}px`
            }}
          />
        ))}
        
        {activeBalls.map(ball => (
          <Ball
            key={ball.id}
            risk={ball.risk}
            style={{
              left: `${ball.x}px`,
              top: `${ball.y}px`,
            }}
          />
        ))}

        {boardRef.current && multipliers.map((multiplier, i) => {
          const binWidth = boardRef.current.clientWidth / multipliers.length;
          return (
            <MultiplierBin
              key={i}
              width={binWidth}
              left={i * binWidth}
              multiplier={multiplier}
            >
              {multiplier}x
            </MultiplierBin>
          );
        })}
      </Board>
      
      <button className="drop-button" onClick={dropBall}>
        <FaChevronDown />
        DROP BALL
      </button>
    </BoardContainer>
  );
};

const MultiplierDisplay = ({ multipliers, betAmount }) => {
  // Only show the last 3 multipliers
  const recentMultipliers = multipliers.slice(-3);
  const totalMultiplier = multipliers.reduce((sum, m) => sum + m, 0);
  
  return (
    <div className="multiplier-display">
      <div className="multiplier-list">
        {recentMultipliers.map((multiplier, index) => (
          <div 
            key={multipliers.length - (recentMultipliers.length - index)} 
            className="multiplier-item animate-roll-down"
          >
            <div className="multiplier-content">
              <span className="multiplier-value">{multiplier.toFixed(2)}x</span>
              <span className="multiplier-amount">${(betAmount * multiplier).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="multiplier-total">
        <div className="total-content">
          <span>Total</span>
          <span className="total-value">{totalMultiplier.toFixed(2)}x</span>
          <span className="total-amount">${(betAmount * totalMultiplier).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [betAmount, setBetAmount] = useState(10);
  const [risk, setRisk] = useState('medium');
  const [multipliers, setMultipliers] = useState([]);

  const handleBetChange = (amount) => {
    setBetAmount(amount);
  };

  const handleRiskChange = (level) => {
    setRisk(level);
  };

  const handleScore = (multiplier) => {
    setMultipliers(prev => [...prev, multiplier]);
  };

  return (
    <div className="app-container">
      <div className="left-panel">
        <MultiplierDisplay multipliers={multipliers} betAmount={betAmount} />
      </div>
      <div className="sidebar">
        <div className="bet-controls">
          <h3>Bet Amount</h3>
          <div className="bet-buttons">
            {[1, 5, 10, 25, 50, 100].map(amount => (
              <button
                key={amount}
                className={`bet-button ${betAmount === amount ? 'active' : ''}`}
                onClick={() => handleBetChange(amount)}
              >
                ${amount}
              </button>
            ))}
          </div>
          
          <h3>Risk Level</h3>
          <div className="risk-buttons">
            {['low', 'medium', 'high'].map(level => (
              <button
                key={level}
                className={`risk-button ${risk === level ? 'active' : ''}`}
                onClick={() => handleRiskChange(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="main-content">
        <PlinkoBoard 
          risk={risk}
          onScore={handleScore}
        />
      </div>
    </div>
  );
}

export default App;
