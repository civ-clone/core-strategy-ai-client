import ChoiceMeta from '@civ-clone/core-client/ChoiceMeta';

export class Data<
  Name extends keyof ChoiceMetaDataMap,
  Type = ChoiceMetaDataMap[Name]
> {
  private _chosen: boolean = false;
  private _meta: ChoiceMeta<Name>;
  private _value: Type | undefined;

  constructor(meta: ChoiceMeta<Name>) {
    this._meta = meta;
  }

  choose(value: Type): void {
    this._chosen = true;
    this._value = value;
  }

  /** Whether a `Strategy` has called `choose`. */
  chosen(): boolean {
    return this._chosen;
  }

  meta(): ChoiceMeta<Name> {
    return this._meta;
  }

  value(): Type | undefined {
    return this._value;
  }
}

export default Data;
