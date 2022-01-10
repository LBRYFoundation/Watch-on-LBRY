import classnames from 'classnames'
import { h } from 'preact'
import './ButtonRadio.sass'


export interface SelectionOption {
  value: string
  display: string
}

export interface ButtonRadioProps<T extends string | SelectionOption = string> {
  name?: string
  onChange(redirect: string): void
  value: T extends SelectionOption ? T['value'] : T
  options: T[]
}

const getAttr = (x: string | SelectionOption, key: keyof SelectionOption): string => typeof x === 'string' ? x : x[key]

export default function ButtonRadio<T extends string | SelectionOption = string>({ name = 'buttonRadio', onChange, options, value }: ButtonRadioProps<T>) {
  /** If it's a string, return the string, if it's a SelectionOption get the selection option property */
  return <div className='ButtonRadio'>
    {options.map(o => ({ o: getAttr(o, 'value'), display: getAttr(o, 'display') })).map(({ o, display }) =>
      <div key={o} className={classnames('radio-button', { 'checked': value === o })}
        onClick={() => o !== value && onChange(o)}>
        <input name={name} value={o} type='radio' checked={value === o} />
        <label>{display}</label>
      </div>
    )}
  </div>
}
