import * as monaco from "monaco-editor";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./App.css";
import DocumentView from "./documentRenderers/DocumentView";
import { setMonacoDefaults } from "./sandbox";
import setupNpmTypeResolver from "./sandbox/setupNpmTypeResolver";
import setupTypecellTypeResolver from "./sandbox/setupTypecellTypeResolver";
import { DocumentResource } from "./store/DocumentResource";
import routing from "./typecellEngine/lib/routing";

setMonacoDefaults(monaco);
setupTypecellTypeResolver();
setupNpmTypeResolver();

const nav = routing();

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <DocumentView owner={nav.owner} document={nav.document} />
    </DndProvider>
  );
};

(window as any).DocumentResource = DocumentResource; // TODO: hacky

export default App;
