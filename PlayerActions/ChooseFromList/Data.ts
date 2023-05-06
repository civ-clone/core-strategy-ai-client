import ChoiceMeta from '@civ-clone/core-client/ChoiceMeta';
export class Data<
  Name extends keyof ChoiceMetaDataMap,
  Type = ChoiceMetaDataMap[Name]
> {
  #meta: ChoiceMeta<Name>;
  #value: Type | undefined;

  constructor(meta: ChoiceMeta<Name>) {
    this.#meta = meta;
  }

  choose(value: Type) {
    this.#value = value;
  }

  meta(): ChoiceMeta<Name> {
    return this.#meta;
  }

  value(): Type | undefined {
    return this.#value;
  }
}

export default Data;
