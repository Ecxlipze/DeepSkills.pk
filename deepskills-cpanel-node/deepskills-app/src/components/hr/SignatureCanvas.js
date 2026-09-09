import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const CanvasWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CanvasElement = styled.canvas`
  width: 100%;
  max-width: 400px;
  height: 150px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  touch-action: none;
`;

const ClearButton = styled.button`
  width: fit-content;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: #fff;
  cursor: pointer;
`;

const getPoint = (event, canvas) => {
  const rect = canvas.getBoundingClientRect();
  if ('touches' in event && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX - rect.left,
      y: event.touches[0].clientY - rect.top
    };
  }
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

const SignatureCanvas = ({ onChange }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#111318';
  }, []);

  const startDrawing = (event) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const { x, y } = getPoint(event, canvas);
    context.beginPath();
    context.moveTo(x, y);
    drawingRef.current = true;
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const { x, y } = getPoint(event, canvas);
    context.lineTo(x, y);
    context.stroke();
    if (!dirty) {
      setDirty(true);
    }
    onChange?.(canvas.toDataURL('image/png'));
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
    onChange?.('');
  };

  return (
    <CanvasWrap>
      <CanvasElement
        ref={canvasRef}
        width={400}
        height={150}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <ClearButton type="button" onClick={clear}>Clear</ClearButton>
    </CanvasWrap>
  );
};

export default SignatureCanvas;
