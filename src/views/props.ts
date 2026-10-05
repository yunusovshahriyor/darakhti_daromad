import type { Dispatch, SetStateAction } from 'react';
import type { State } from '../types';

export type Tab = 'home' | 'income' | 'expense' | 'more';

export interface Props {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
}
