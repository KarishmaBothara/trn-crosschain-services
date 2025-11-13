import { rootWSEndpoint } from "@trncs/ebd/config";
import { getChainApi as getApi } from "@trncs/utils/getChainApi";

export const getRootApi = getApi.bind(null, rootWSEndpoint);
