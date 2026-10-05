import type { Dispatch, SetStateAction } from 'react';
import type { State } from '../types';

export type Tab = 'home' | 'accounts' | 'history' | 'more';

export interface Props {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
}
