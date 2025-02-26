import React, { ReactElement } from 'react';
import { css } from '@emotion/css';
import { Draggable } from 'react-beautiful-dnd';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, IconButton, useStyles2, useTheme2 } from '@grafana/ui';
import { selectors } from '@grafana/e2e-selectors';

import { getVariableUsages, UsagesToNetwork, VariableUsageTree } from '../inspect/utils';
import { hasOptions, isAdHoc, isQuery } from '../guard';
import { toVariableIdentifier, VariableIdentifier } from '../state/types';
import { VariableUsagesButton } from '../inspect/VariableUsagesButton';
import { VariableModel } from '../types';

export interface VariableEditorListRowProps {
  index: number;
  variable: VariableModel;
  usageTree: VariableUsageTree[];
  usagesNetwork: UsagesToNetwork[];
  onEdit: (identifier: VariableIdentifier) => void;
  onDuplicate: (identifier: VariableIdentifier) => void;
  onDelete: (identifier: VariableIdentifier) => void;
}

export function VariableEditorListRow({
  index,
  variable,
  usageTree,
  usagesNetwork,
  onEdit: propsOnEdit,
  onDuplicate: propsOnDuplicate,
  onDelete: propsOnDelete,
}: VariableEditorListRowProps): ReactElement {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const definition = getDefinition(variable);
  const usages = getVariableUsages(variable.id, usageTree);
  const passed = usages > 0 || isAdHoc(variable);
  const identifier = toVariableIdentifier(variable);

  return (
    <Draggable draggableId={JSON.stringify(identifier)} index={index}>
      {(provided, snapshot) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            userSelect: snapshot.isDragging ? 'none' : 'auto',
            background: snapshot.isDragging ? theme.colors.background.secondary : undefined,
            ...provided.draggableProps.style,
          }}
        >
          <td className={styles.column}>
            <span
              onClick={(event) => {
                event.preventDefault();
                propsOnEdit(identifier);
              }}
              className={styles.nameLink}
              aria-label={selectors.pages.Dashboard.Settings.Variables.List.tableRowNameFields(variable.name)}
            >
              {variable.name}
            </span>
          </td>
          <td
            className={styles.definitionColumn}
            onClick={(event) => {
              event.preventDefault();
              propsOnEdit(identifier);
            }}
            aria-label={selectors.pages.Dashboard.Settings.Variables.List.tableRowDefinitionFields(variable.name)}
          >
            {definition}
          </td>

          <td className={styles.column}>
            <VariableCheckIndicator passed={passed} />
          </td>

          <td className={styles.column}>
            <VariableUsagesButton id={variable.id} isAdhoc={isAdHoc(variable)} usages={usagesNetwork} />
          </td>

          <td className={styles.column}>
            <IconButton
              onClick={(event) => {
                event.preventDefault();
                propsOnDuplicate(identifier);
              }}
              name="copy"
              title="Duplicate variable"
              aria-label={selectors.pages.Dashboard.Settings.Variables.List.tableRowDuplicateButtons(variable.name)}
            />
          </td>

          <td className={styles.column}>
            <IconButton
              onClick={(event) => {
                event.preventDefault();
                propsOnDelete(identifier);
              }}
              name="trash-alt"
              title="Remove variable"
              aria-label={selectors.pages.Dashboard.Settings.Variables.List.tableRowRemoveButtons(variable.name)}
            />
          </td>
          <td className={styles.column}>
            <div {...provided.dragHandleProps} className={styles.dragHandle}>
              <Icon name="draggabledots" size="lg" />
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );
}

function getDefinition(model: VariableModel): string {
  let definition = '';
  if (isQuery(model)) {
    if (model.definition) {
      definition = model.definition;
    } else if (typeof model.query === 'string') {
      definition = model.query;
    }
  } else if (hasOptions(model)) {
    definition = model.query;
  }

  return definition;
}

interface VariableCheckIndicatorProps {
  passed: boolean;
}

function VariableCheckIndicator({ passed }: VariableCheckIndicatorProps): ReactElement {
  const styles = useStyles2(getStyles);
  if (passed) {
    return (
      <Icon
        name="check"
        className={styles.iconPassed}
        title="This variable is referenced by other variables or dashboard."
      />
    );
  }

  return (
    <Icon
      name="exclamation-triangle"
      className={styles.iconFailed}
      title="This variable is not referenced by any variable or dashboard."
    />
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    dragHandle: css`
      cursor: grab;
    `,
    column: css`
      width: 1%;
    `,
    nameLink: css`
      cursor: pointer;
      color: ${theme.colors.primary.text};
    `,
    definitionColumn: css`
      width: 100%;
      max-width: 200px;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      -o-text-overflow: ellipsis;
      white-space: nowrap;
    `,
    iconPassed: css`
      color: ${theme.v1.palette.greenBase};
    `,
    iconFailed: css`
      color: ${theme.v1.palette.orange};
    `,
  };
}
