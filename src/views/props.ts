import type { Dispatch, SetStateAction } from 'react';
import type { State } from '../types';

export type Tab = 'home' | 'accounts' | 'history' | 'profile';

export interface Props {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
}

export type Sub = 'dreams' | 'debts' | 'settings';
