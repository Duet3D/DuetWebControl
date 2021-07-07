'use strict';

export const AccelStates = {
  UNKNOWN: 0,
  ABORTING: 1,
  INIT: 2,
  RUNNING: 3,
  HALTED: 4,
  ANALYZING: 5
};

export const AccelAlgorithm = {
  NONE: "none",
  CUSTOM: "custom",
  ZVD: "zvd",
  ZVDD: "zvdd",
  EI2: "ei2",
  EI3: "ei3"
};
