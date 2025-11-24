import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameControlsProps {
  gamePhase: string;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canSplit: boolean;
  canInsurance: boolean;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
  onDeal: () => void;
  onInsuranceYes: () => void;
  onInsuranceNo: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gamePhase,
  canHit,
  canStand,
  canDouble,
  canSplit,
  canInsurance,
  onHit,
  onStand,
  onDouble,
  onSplit,
  onDeal,
  onInsuranceYes,
  onInsuranceNo,
}) => {
  return (
    <div className="space-y-4">
      {/* Insurance Prompt */}
      <AnimatePresence>
        {gamePhase === 'insurance' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-900 border-2 border-blue-400 rounded-lg p-2"
          >
            <div className="text-white font-bold mb-2 text-sm">Dealer shows Ace - Insurance offered (2:1)</div>
            <div className="flex gap-2">
              <motion.button
                onClick={onInsuranceYes}
                className="flex-1 py-1 px-3 bg-green-600 hover:bg-green-500 text-white font-bold text-sm rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Yes
              </motion.button>
              <motion.button
                onClick={onInsuranceNo}
                className="flex-1 py-1 px-3 bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Decline
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Action Buttons */}
      {gamePhase === 'playing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-2"
        >
          <ActionButton
            onClick={onHit}
            disabled={!canHit}
            label="Hit"
            shortcut="H"
            color="blue"
          />
          <ActionButton
            onClick={onStand}
            disabled={!canStand}
            label="Stand"
            shortcut="S"
            color="red"
          />
          <ActionButton
            onClick={onDouble}
            disabled={!canDouble}
            label="Double"
            shortcut="D"
            color="purple"
          />
          <ActionButton
            onClick={onSplit}
            disabled={!canSplit}
            label="Split"
            shortcut="P"
            color="green"
          />
        </motion.div>
      )}

      {/* Keyboard Shortcuts Help */}
      {gamePhase === 'playing' && (
        <div className="bg-gray-800 rounded-lg p-2 text-xs text-gray-400 space-y-0.5">
          <div>⌨️ Keyboard Shortcuts:</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>H = Hit</div>
            <div>S = Stand</div>
            <div>D = Double</div>
            <div>P = Split</div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
  shortcut: string;
  color: 'blue' | 'red' | 'purple' | 'green';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  disabled,
  label,
  shortcut,
  color,
}) => {
  const colorStyles = {
    blue: { backgroundColor: '#2563eb', hoverColor: '#1d4ed8' },
    red: { backgroundColor: '#dc2626', hoverColor: '#b91c1c' },
    purple: { backgroundColor: '#9333ea', hoverColor: '#7e22ce' },
    green: { backgroundColor: '#16a34a', hoverColor: '#15803d' },
  };

  const style = colorStyles[color];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: style.backgroundColor,
        color: 'white',
        padding: '0.4rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        borderRadius: '0.4rem',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.1rem',
      }}
      onHoverStart={() => !disabled && (onclick as any)}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      <span>{label}</span>
      <span style={{ fontSize: '0.625rem', opacity: 0.7 }}>[{shortcut}]</span>
    </motion.button>
  );
};

export const PlayingActionButtons: React.FC<{
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canSplit: boolean;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
}> = ({
  canHit,
  canStand,
  canDouble,
  canSplit,
  onHit,
  onStand,
  onDouble,
  onSplit,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="grid grid-cols-4 gap-2"
  >
    <ActionButton
      onClick={onHit}
      disabled={!canHit}
      label="Hit"
      shortcut="H"
      color="blue"
    />
    <ActionButton
      onClick={onStand}
      disabled={!canStand}
      label="Stand"
      shortcut="S"
      color="red"
    />
    <ActionButton
      onClick={onDouble}
      disabled={!canDouble}
      label="Double"
      shortcut="D"
      color="purple"
    />
    <ActionButton
      onClick={onSplit}
      disabled={!canSplit}
      label="Split"
      shortcut="P"
      color="green"
    />
  </motion.div>
);
