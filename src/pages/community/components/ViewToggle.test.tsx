import { expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ViewToggle from './ViewToggle'

it('渲染两个按钮，当前视图按钮高亮，点击触发 onChange', () => {
  const onChange = vi.fn()
  render(<ViewToggle view="magazine" onChange={onChange} />)
  const toggle = screen.getByTestId('view-toggle')
  expect(toggle.style.backdropFilter).toBe('blur(10px)')
  fireEvent.click(screen.getByTestId('toggle-route'))
  expect(onChange).toHaveBeenCalledWith('route')
})
