import { CodeModel } from "../../CodeModel";
import { ResolvedImport } from "../../Engine";
import { CodeModelMock } from "./CodeModelMock";
import * as logdown from "logdown";

export function waitTillEvent<T>(
  e: (listener: (arg0: T) => void) => void,
  expected: number
): Promise<T[]> {
  const captured: T[] = [];
  return new Promise((resolve) => {
    e(({ ...args }) => {
      if (captured.length < expected) {
        captured.push(args);
      }
      if (captured.length === expected) {
        return resolve(captured);
      }
    });
  });
}

export async function importResolver(
  module: string,
  _forModel: CodeModel
): Promise<ResolvedImport> {
  if (module === "logdown") {
    return (async () => {
      return {
        module: logdown.default,
        dispose: () => {},
      };
    })();
  }

  const res = async () => {
    return {
      module: {
        default: {},
      },
      dispose: () => {},
    };
  };

  return res();
}

export function toAMDFormat(code: string) {
  return `define(["require", "exports"], function(require, exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      ${code}
      });
      `;
}

export function buildMockedModel(name: string, code: string) {
  return new CodeModelMock("javascript", name, toAMDFormat(code));
}
