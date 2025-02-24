// @flow strict-local

import type {
  Asset as IAsset,
  Bundle as IBundle,
  BundleGraph as IBundleGraph,
  BundleGroup,
  Dependency as IDependency,
  GraphTraversalCallback,
  Symbol,
  SymbolResolution,
} from '@parcel/types';
import type {ParcelOptions} from '../types';
import type InternalBundleGraph from '../BundleGraph';

import invariant from 'assert';
import nullthrows from 'nullthrows';
import {DefaultWeakMap} from '@parcel/utils';

import {assetFromValue, assetToInternalAsset, Asset} from './Asset';
import {Bundle, bundleToInternalBundle} from './Bundle';
import Dependency, {dependencyToInternalDependency} from './Dependency';
import {mapVisitor} from '../Graph';

const internalBundleGraphToBundleGraph: DefaultWeakMap<
  ParcelOptions,
  WeakMap<InternalBundleGraph, BundleGraph>,
> = new DefaultWeakMap(() => new WeakMap());
// Friendly access for other modules within this package that need access
// to the internal bundle.
const _bundleGraphToInternalBundleGraph: WeakMap<
  IBundleGraph,
  InternalBundleGraph,
> = new WeakMap();
export function bundleGraphToInternalBundleGraph(
  bundleGraph: IBundleGraph,
): InternalBundleGraph {
  return nullthrows(_bundleGraphToInternalBundleGraph.get(bundleGraph));
}

export default class BundleGraph implements IBundleGraph {
  #graph; // InternalBundleGraph
  #options; // ParcelOptions

  constructor(graph: InternalBundleGraph, options: ParcelOptions) {
    let existing = internalBundleGraphToBundleGraph.get(options).get(graph);
    if (existing != null) {
      return existing;
    }

    this.#graph = graph;
    this.#options = options;
    _bundleGraphToInternalBundleGraph.set(this, graph);
    internalBundleGraphToBundleGraph.get(options).set(graph, this);
  }

  getDependencyResolution(dep: IDependency): ?Asset {
    let resolution = this.#graph.getDependencyResolution(
      dependencyToInternalDependency(dep),
    );
    if (resolution) {
      return assetFromValue(resolution, this.#options);
    }
  }

  getIncomingDependencies(asset: IAsset): Array<IDependency> {
    return this.#graph
      .getIncomingDependencies(assetToInternalAsset(asset).value)
      .map(dep => new Dependency(dep));
  }

  getBundleGroupsContainingBundle(bundle: IBundle): Array<BundleGroup> {
    return this.#graph.getBundleGroupsContainingBundle(
      bundleToInternalBundle(bundle),
    );
  }

  getSiblingBundles(bundle: IBundle): Array<IBundle> {
    return this.#graph
      .getSiblingBundles(bundleToInternalBundle(bundle))
      .map(bundle => new Bundle(bundle, this.#graph, this.#options));
  }

  getExternalDependencies(bundle: IBundle): Array<IDependency> {
    let externalDependencies = [];
    this.#graph.traverseBundle(bundleToInternalBundle(bundle), node => {
      if (
        node.type === 'dependency' &&
        (this.#graph.getDependencyResolution(node.value) == null ||
          this.#graph._graph
            .getNodesConnectedFrom(node)
            .find(node => node.type === 'bundle_group'))
      ) {
        externalDependencies.push(new Dependency(node.value));
      }
    });
    return externalDependencies;
  }

  resolveExternalDependency(dependency: IDependency): ?BundleGroup {
    let node = this.#graph._graph
      .getNodesConnectedFrom(
        nullthrows(this.#graph._graph.getNode(dependency.id)),
      )
      .find(node => node.type === 'bundle_group');

    if (node == null) {
      return;
    }

    invariant(node.type === 'bundle_group');
    return node.value;
  }

  getDependencies(asset: IAsset): Array<IDependency> {
    return this.#graph
      .getDependencies(assetToInternalAsset(asset).value)
      .map(dep => new Dependency(dep));
  }

  isAssetInAncestorBundles(bundle: IBundle, asset: IAsset): boolean {
    let internalNode = this.#graph._graph.getNode(bundle.id);
    invariant(internalNode != null && internalNode.type === 'bundle');
    return this.#graph.isAssetInAncestorBundles(
      internalNode.value,
      assetToInternalAsset(asset).value,
    );
  }

  isAssetReferenced(asset: IAsset): boolean {
    return this.#graph.isAssetReferenced(assetToInternalAsset(asset).value);
  }

  isAssetReferencedByAssetType(asset: IAsset, type: string): boolean {
    return this.#graph.isAssetReferencedByAssetType(
      assetToInternalAsset(asset).value,
      type,
    );
  }

  hasParentBundleOfType(bundle: IBundle, type: string): boolean {
    return this.#graph.hasParentBundleOfType(
      bundleToInternalBundle(bundle),
      type,
    );
  }

  getBundlesInBundleGroup(bundleGroup: BundleGroup): Array<IBundle> {
    return this.#graph
      .getBundlesInBundleGroup(bundleGroup)
      .map(bundle => new Bundle(bundle, this.#graph, this.#options));
  }

  getBundles(): Array<IBundle> {
    return this.#graph
      .getBundles()
      .map(bundle => new Bundle(bundle, this.#graph, this.#options));
  }

  getChildBundles(bundle: IBundle): Array<IBundle> {
    return this.#graph
      .getChildBundles(bundleToInternalBundle(bundle))
      .map(bundle => new Bundle(bundle, this.#graph, this.#options));
  }

  resolveSymbol(asset: IAsset, symbol: Symbol): SymbolResolution {
    let res = this.#graph.resolveSymbol(
      assetToInternalAsset(asset).value,
      symbol,
    );
    return {
      asset: assetFromValue(res.asset, this.#options),
      exportSymbol: res.exportSymbol,
      symbol: res.symbol,
    };
  }

  getExportedSymbols(asset: IAsset): Array<SymbolResolution> {
    let res = this.#graph.getExportedSymbols(assetToInternalAsset(asset).value);
    return res.map(e => ({
      asset: assetFromValue(e.asset, this.#options),
      exportSymbol: e.exportSymbol,
      symbol: e.symbol,
    }));
  }

  traverseBundles<TContext>(
    visit: GraphTraversalCallback<IBundle, TContext>,
  ): ?TContext {
    return this.#graph.traverseBundles(
      mapVisitor(
        bundle => new Bundle(bundle, this.#graph, this.#options),
        visit,
      ),
    );
  }

  findBundlesWithAsset(asset: IAsset): Array<IBundle> {
    return this.#graph
      .findBundlesWithAsset(assetToInternalAsset(asset).value)
      .map(bundle => new Bundle(bundle, this.#graph, this.#options));
  }
}
