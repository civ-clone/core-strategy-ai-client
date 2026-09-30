import ChoiceMeta from '@civ-clone/core-client/ChoiceMeta';
export declare class Data<
  Name extends keyof ChoiceMetaDataMap,
  Type = ChoiceMetaDataMap[Name]
> {
  private _chosen;
  private _meta;
  private _value;
  constructor(meta: ChoiceMeta<Name>);
  choose(value: Type): void;
  /** Whether a `Strategy` has called `choose`. */
  chosen(): boolean;
  meta(): ChoiceMeta<Name>;
  /** Forgets any choice, so the next `Strategy` starts from nothing. */
  reset(): void;
  value(): Type | undefined;
}
export default Data;
