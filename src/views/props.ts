import type { Dispatch, SetStateAction } from 'react';
import type { State } from '../types';

export interface Props {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
}
