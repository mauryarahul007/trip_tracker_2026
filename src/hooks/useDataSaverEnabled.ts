import { createLocalBoolPref } from './useLocalBoolPref';

const dataSaverPref = createLocalBoolPref('tt-data-saver');

export const getDataSaverEnabled = dataSaverPref.get;
export const setDataSaverEnabled = dataSaverPref.set;
export const useDataSaverEnabled = dataSaverPref.useValue;
