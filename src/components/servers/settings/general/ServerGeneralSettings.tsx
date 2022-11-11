import styles from './styles.module.scss'
import env from '@/common/env';
import { classNames, conditionalClass } from '@/common/classNames';
import { useParams } from '@nerimity/solid-router';
import { createEffect, createSignal, Show } from 'solid-js';
import useStore from '@/chat-api/store/useStore';
import { useWindowProperties } from '@/common/useWindowProperties';
import Input from '@/components/ui/input/Input';
import DropDown from '@/components/ui/drop-down/DropDown';
import Button from '@/components/ui/Button';
import { createUpdatedSignal } from '@/common/createUpdatedSignal';
import { deleteServer, updateServerSettings } from '@/chat-api/services/ServerService';
import SettingsBlock from '@/components/ui/settings-block/SettingsBlock';
import { Server } from '@/chat-api/store/useServers';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal/DeleteConfirmModal';
import Modal from '@/components/ui/modal/Modal';
import { useCustomPortal } from '@/components/ui/custom-portal/CustomPortal';

export default function ServerGeneralSettings() {
  const {serverId} = useParams();
  const {header, servers, channels} = useStore();
  const windowProperties = useWindowProperties();
  const [mobileSize, isMobileSize] = createSignal(false);
  const [requestSent, setRequestSent] = createSignal(false);
  const [error, setError] = createSignal<null | string>(null);
  const createPortal = useCustomPortal();

  const server = () => servers.get(serverId);

  const defaultInput = () => ({
    name: server()?.name || '',
    defaultChannelId: server()?.defaultChannelId || '',
    systemChannelId: server()?.systemChannelId || null
  })

  const [inputValues, updatedInputValues, setInputValue] = createUpdatedSignal(defaultInput);


  const dropDownChannels = () => channels.getChannelsByServerId(serverId).map(channel => ({
    id: channel!.id,
    label: channel!.name,
    onClick: () => {
      setInputValue('defaultChannelId', channel!.id);
    }
  }));

  const dropDownSystemChannels = () => {
    const list = channels.getChannelsByServerId(serverId).map(channel => ({
      id: channel!.id,
      label: channel!.name,
      onClick: () => {
        setInputValue('systemChannelId', channel!.id);
      }
    }));

    return [{
      id: null,
      label: "None",
      onClick: () => {
        setInputValue("systemChannelId", null);
      }
    }, ...list]
  };

  createEffect(() => {
    const isMobile = windowProperties.paneWidth()! < env.MOBILE_WIDTH;
    isMobileSize(isMobile);
  })
  
  createEffect(() => {
    header.updateHeader({
      title: "Settings - General",
      serverId: serverId!,
      iconName: 'settings',
    });
  })

  const onSaveButtonClicked = async () => {
    if (requestSent()) return;
    setRequestSent(true);
    setError(null);
    const values = updatedInputValues();
    await updateServerSettings(serverId!, values)
      .catch((err) => setError(err.message))
      .finally(() => setRequestSent(false));
  }

  const requestStatus = () => requestSent() ? 'Saving...' : 'Save Changes';


  const showDeleteConfirm = () => {
    createPortal?.(close => <Modal {...close} title={`Delete ${server()?.name}`} children={() => <ServerDeleteConfirmModal close={close} server={server()!} />} />)
  }

  return (
    <div class={classNames(styles.generalPane, conditionalClass(mobileSize(), styles.mobile))}>
      <div class={styles.title}>Server General</div>
      
      <SettingsBlock icon='edit' label='Server Name'>
        <Input value={inputValues().name} onText={(v) => setInputValue('name', v) } />
      </SettingsBlock>
      <SettingsBlock icon='tag' label='Default Channel' description='New members will be directed to this channel.'>
        <DropDown items={dropDownChannels()} selectedId={inputValues().defaultChannelId} />
      </SettingsBlock>



        
      <SettingsBlock icon="wysiwyg" label="System Messages" description="Where system messages should appear.">
        <DropDown items={dropDownSystemChannels()} selectedId={inputValues().systemChannelId}  />
      </SettingsBlock>

      
      <SettingsBlock icon='delete' label='Delete this server' description='This cannot be undone!'>
        <Button label='Delete Server' color='var(--alert-color)' onClick={showDeleteConfirm} />
      </SettingsBlock>
      <Show when={error()}><div class={styles.error}>{error()}</div></Show>
      <Show when={Object.keys(updatedInputValues()).length}>
        <Button iconName='save' label={requestStatus()} class={styles.saveButton} onClick={onSaveButtonClicked} />
      </Show>

    </div>
  )
}


function ServerDeleteConfirmModal(props: {server: Server, close: () => void;}) {
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!props.server) {
      props.close();
    }
  })
  
  const onDeleteClick = async () => {
    setError(null);

    deleteServer(props.server.id)
      .catch(e => setError(e))
  }

  return (
    <DeleteConfirmModal
      errorMessage={error()}
      confirmText={props.server.name}
      onDeleteClick={onDeleteClick}
    />
  )
}