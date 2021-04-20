import { generateKeyBetween } from "fractional-indexing";
import { DocConnection } from "./DocConnection";
import {
  ReferenceDefinition,
  Ref,
  validateRef,
  getHashForReference,
  createRef,
  reverseReferenceDefinition,
} from "./Ref";

import * as Y from "yjs";
import { DocumentResource } from "./DocumentResource";

/**
 * A resource is an entity definied by a unique id.
 * All entities extend from BaseResource, which provides support for id, type, and references
 */
export class BaseResource {
  /** @internal */
  public constructor(
    /** @internal */ protected readonly connection: DocConnection
  ) {}

  /** @internal */
  protected get ydoc() {
    return this.connection._ydoc;
  }

  public get id() {
    return this.connection.id;
  }
  public get type(): string {
    return this.ydoc.getMap("meta").get("type");
  }

  // TODO: do / how do we want to expose this?
  /** @internal */
  public get webrtcProvider() {
    return this.connection.webrtcProvider;
  }

  /**
   * When the entity has a type (it has either just been "created" or loaded from a remote),
   * we can load
   */
  public get doc() {
    return this.getSpecificType<DocumentResource>(
      (window as any).DocumentResource // TODO: hacky to prevent circular ref
    );
  }

  private _specificType: any;

  public getSpecificType<T extends BaseResource>(
    constructor: new (connection: DocConnection) => T
  ): T | undefined {
    if (this._specificType && !(this._specificType instanceof constructor)) {
      throw new Error("already has different specifictype");
    }

    if (!this.type) {
      return undefined;
    }

    this._specificType = this._specificType || new constructor(this.connection);

    return this._specificType;
  }

  public create(type: string) {
    this.ydoc.getMap("meta").set("type", type);
    this.ydoc.getMap("meta").set("created_at", Date.now());
  }

  private get _refs(): Y.Map<any> {
    let map: Y.Map<any> = this.ydoc.getMap("refs");
    return map;
  }

  public getRefs(definition: ReferenceDefinition) {
    const ret: Ref[] = []; // TODO: type
    // this.ydoc.getMap("refs").forEach((val, key) => {
    //   this.ydoc.getMap("refs").delete(key);
    // });
    this.ydoc.getMap("refs").forEach((val) => {
      if (
        val.namespace !== definition.namespace ||
        val.type !== definition.type
      ) {
        // filter
        return;
      }
      if (!validateRef(val, definition)) {
        throw new Error("unexpected");
      }
      if (
        val.namespace === definition.namespace &&
        val.type === definition.type
      ) {
        ret.push(val);
      }
    });

    ret.sort((a, b) => ((a.sortKey || "") < (b.sortKey || "") ? -1 : 1));
    return ret;
  }

  public getRef(definition: ReferenceDefinition, key: string) {
    const ref = this._refs.get(key);
    if (ref && !validateRef(ref, definition)) {
      throw new Error("unexpected"); // ref with key exists, but doesn't conform to definition
    }
    return ref;
  }

  public removeRef(definition: ReferenceDefinition, targetId: string) {
    this._refs.delete(getHashForReference(definition, targetId));
    // TODO: delete reverse?
  }

  public moveRef(
    definition: ReferenceDefinition,
    targetId: string,
    index: number
  ) {
    const key = getHashForReference(definition, targetId);
    let existing = this.getRef(definition, key);
    if (!existing) {
      throw new Error("ref not found");
    }

    if (
      definition.relationship.type === "unique" ||
      !definition.relationship.sorted
    ) {
      throw new Error("called moveRef on non sorted definition");
    }

    const refs = this.getRefs(definition);
    const sortKey = generateKeyBetween(
      index === 0 ? null : refs[index - 1].sortKey || null,
      index >= refs.length ? null : refs[index].sortKey || null
    );
    this._refs.set(key, createRef(definition, targetId, sortKey));
  }

  public ensureRef(
    definition: ReferenceDefinition,
    targetId: string,
    index?: number,
    checkReverse = true
  ) {
    // const ref = new Ref(definition, targetId);

    const key = getHashForReference(definition, targetId);
    let existing = this.getRef(definition, key);
    if (existing) {
      // The document already has this relationship
      if (existing.target !== targetId) {
        // The relationship that exists is different, remove the reverse relationship
        const doc = DocConnection.load(existing.target); // TODO: unload document
        doc.removeRef(reverseReferenceDefinition(definition), this.id);
      }
    }
    // Add the relationship
    let sortKey: string | undefined;

    if (
      definition.relationship.type === "many" &&
      definition.relationship.sorted
    ) {
      const refs = this.getRefs(definition).filter(
        (r) => r.target !== targetId
      );
      if (index === undefined) {
        // append as last item
        sortKey = generateKeyBetween(refs.pop()?.sortKey || null, null);
      } else {
        let sortKeyA = index === 0 ? null : refs[index - 1].sortKey || null;
        let sortKeyB =
          index >= refs.length ? null : refs[index].sortKey || null;
        if (sortKeyA === sortKeyB && sortKeyA !== null) {
          console.warn("unexpected");
          sortKeyB = null;
        }
        sortKey = generateKeyBetween(sortKeyA, sortKeyB);
      }
    }

    this._refs.set(key, createRef(definition, targetId, sortKey));
    if (checkReverse) {
      // Add the reverse relationship
      const reverseDoc = DocConnection.load(targetId); // TODO: unload document
      reverseDoc.ensureRef(
        reverseReferenceDefinition(definition),
        this.id,
        undefined,
        false
      );
    }
  }

  public dispose() {
    // This should always only dispose the connection
    // BaseResource is not meant to manage other resources,
    // because BaseResource can be initiated often (in YDocConnection.load), and is not cached
    this.connection.dispose();
  }
}
