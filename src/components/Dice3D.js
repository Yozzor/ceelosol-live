import React from 'react';
import './Dice3D.css';

/**
 * 3D Animated Dice Component with Texture
 * Uses CSS 3D transforms to create realistic dice
 */
function Dice3D({ value, isRolling, index }) {

  return (
    <div className="dice3d-container">
      <div
        className={`dice3d ${isRolling ? 'rolling' : `show-${value}`}`}
        style={{
          animationDelay: `${index * 0.2}s`
        }}
      >
        <div className="dice3d-inner">
          {/* Face 1 (nth-child 1) - ONE DOT */}
          <div className="side one">
            <div className="dot one-1"></div>
          </div>

          {/* Face 6 (nth-child 2) - SIX DOTS */}
          <div className="side six">
            <div className="dot six-1"></div>
            <div className="dot six-2"></div>
            <div className="dot six-3"></div>
            <div className="dot six-4"></div>
            <div className="dot six-5"></div>
            <div className="dot six-6"></div>
          </div>

          {/* Face 3 (nth-child 3) - THREE DOTS */}
          <div className="side three">
            <div className="dot three-1"></div>
            <div className="dot three-2"></div>
            <div className="dot three-3"></div>
          </div>

          {/* Face 4 (nth-child 4) - FOUR DOTS */}
          <div className="side four">
            <div className="dot four-1"></div>
            <div className="dot four-2"></div>
            <div className="dot four-3"></div>
            <div className="dot four-4"></div>
          </div>

          {/* Face 5 (nth-child 5) - FIVE DOTS */}
          <div className="side five">
            <div className="dot five-1"></div>
            <div className="dot five-2"></div>
            <div className="dot five-3"></div>
            <div className="dot five-4"></div>
            <div className="dot five-5"></div>
          </div>

          {/* Face 2 (nth-child 6) - TWO DOTS */}
          <div className="side two">
            <div className="dot two-1"></div>
            <div className="dot two-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dice3D;
