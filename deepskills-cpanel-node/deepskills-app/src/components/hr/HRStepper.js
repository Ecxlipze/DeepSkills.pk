import React from 'react';
import styled from 'styled-components';
import { FaCheck, FaLock } from 'react-icons/fa';

const STEPS = [
  { name: 'Personal Info', desc: 'Core teacher details' },
  { name: 'Documents', desc: 'CNIC, degrees & CV' },
  { name: 'JD Review', desc: 'Job role & deliverables' },
  { name: 'Signature', desc: 'Digital contract sign' },
  { name: 'Hiring Files', desc: 'Offer & agreement' }
];

const StepperContainer = styled.div`
  background: rgba(17, 19, 24, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 999px;
  }
`;

const StepItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: fit-content;
  opacity: ${({ $state }) => ($state === 'locked' ? 0.45 : 1)};
  transition: all 0.2s ease;
`;

const StepIconCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.2s ease;

  ${({ $state }) => {
    if ($state === 'complete') {
      return `
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.35);
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
      `;
    }
    if ($state === 'current') {
      return `
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
      `;
    }
    return `
      background: rgba(255, 255, 255, 0.04);
      color: #64748b;
      border: 1px solid rgba(255, 255, 255, 0.08);
    `;
  }}
`;

const StepMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  .step-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: ${({ $state }) => {
      if ($state === 'complete') return '#34d399';
      if ($state === 'current') return '#ffffff';
      return '#64748b';
    }};
    white-space: nowrap;
  }

  .step-desc {
    font-size: 0.72rem;
    color: ${({ $state }) => ($state === 'current' ? '#c4b5fd' : '#475569')};
    white-space: nowrap;
  }
`;

const ConnectorLine = styled.div`
  flex: 1;
  min-width: 24px;
  height: 2px;
  border-radius: 999px;
  background: ${({ $complete }) =>
    $complete
      ? 'linear-gradient(90deg, #10b981, rgba(16, 185, 129, 0.4))'
      : 'rgba(255, 255, 255, 0.06)'};
`;

const getStepState = (index, currentStep) => {
  const stepNumber = index + 1;
  if (stepNumber < currentStep) return 'complete';
  if (stepNumber === currentStep) return 'current';
  return 'locked';
};

const HRStepper = ({ currentStep = 1 }) => {
  return (
    <StepperContainer>
      {STEPS.map((step, index) => {
        const state = getStepState(index, currentStep);
        const isCompletedOrPassed = index + 1 < currentStep;

        return (
          <React.Fragment key={step.name}>
            <StepItem $state={state}>
              <StepIconCircle $state={state}>
                {state === 'complete' ? (
                  <FaCheck />
                ) : state === 'current' ? (
                  index + 1
                ) : (
                  <FaLock style={{ fontSize: '0.75rem' }} />
                )}
              </StepIconCircle>
              <StepMeta $state={state}>
                <span className="step-name">{step.name}</span>
                <span className="step-desc">{step.desc}</span>
              </StepMeta>
            </StepItem>
            {index !== STEPS.length - 1 && (
              <ConnectorLine $complete={isCompletedOrPassed} />
            )}
          </React.Fragment>
        );
      })}
    </StepperContainer>
  );
};

export default HRStepper;
